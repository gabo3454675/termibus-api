/**
 * ═══════════════════════════════════════════════════════════════
 *  Adaptador GPS Mock
 * ═══════════════════════════════════════════════════════════════
 *
 * WARN: El intervalo de simulación (setInterval cada 3s) se
 *       mantiene activo mientras exista al menos una unidad en
 *       el mapa. Si el servidor se mantiene encendido días, las
 *       posiciones de unidades no usadas seguirán actualizándose.
 *       Esto es intencional: necesitamos datos frescos para el
 *       tablero de monitoreo. Si el consumo de CPU es un problema,
 *       reducir TICK_INTERVAL_MS o agregar cleanup de unidades
 *       inactivas > 1h.
 *
 * TODO: El 5% de desconexión aleatoria puede causar falsos
 *       positivos en tests. Ver TASK-002 issue del critic sobre
 *       determinismo de conectividad. La corrección usaría el
 *       seed de la unidad para determinar conectividad inicial.
 *
 * ─────────────────────────────────────────────────────────────
 * Adaptador mock del servicio GPS (con Circuit Breaker)
 *
 * Simula el comportamiento de un proveedor GPS real:
 *   - Cada unidad tiene una posición de inicio determinista.
 *   - Las posiciones se actualizan cada 3 s con deriva aleatoria.
 *   - La velocidad varía entre 0 y 80 km/h.
 *   - La batería decrece lentamente.
 *   - El 5 % de las unidades aparecen desconectadas.
 *
 * Los métodos públicos están protegidos por Circuit Breaker
 * (patrón ADR-006) para que, si el servicio externo falla,
 * el sistema no continúe haciendo peticiones innecesarias.
 *
 * La lógica real está en los métodos privados `_getPosition`,
 * `_getStatus` y `_getLastKnownPositions`. Los públicos
 * delegan en el proxy.
 * ─────────────────────────────────────────────────────────────
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { GpsServicePort, GpsPosition, GpsUnitStatus } from '../ports';
import { CircuitBreakerProxy } from '../circuit-breaker';

/**
 * Coordenadas base de Maracaibo, Venezuela.
 * Se usa como centro del área de simulación.
 */
const MARACAIBO_LAT = 10.65;
const MARACAIBO_LNG = -71.65;

/**
 * Factor de dispersión para generar posiciones distintas por unidad.
 * Cada unidad se separa ~0.02° (~2 km) de la base.
 */
const POSITION_SPREAD = 0.02;

/**
 * Máxima variación por tick de simulación en grados.
 * A 80 km/h y 3 s entre ticks: ~0.067 km ≈ 0.0006°.
 */
const MAX_DELTA_PER_TICK = 0.003;

/**
 * Intervalo de actualización en milisegundos (cada 3 s).
 */
const TICK_INTERVAL_MS = 3000;

/**
 * Probabilidad de que una unidad esté conectada (95 %).
 */
const CONNECTED_PROBABILITY = 0.95;

@Injectable()
export class MockGpsAdapter implements GpsServicePort, OnModuleDestroy {
  private readonly logger = new Logger(MockGpsAdapter.name);

  /**
   * Mapa interno de posiciones activas, key = unidadId.
   * Persiste entre llamadas para simular continuidad.
   */
  private readonly positions = new Map<string, GpsPosition>();

  /**
   * Mapa interno de estados, key = unidadId.
   */
  private readonly statuses = new Map<string, GpsUnitStatus>();

  /**
   * Referencia al intervalo de actualización, para poder
   * limpiarlo en `onModuleDestroy`.
   */
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * @param circuitBreakerProxy Proxy inyectable de Circuit Breaker.
   *        Protege las llamadas a métodos públicos con el patrón
   *        ADR-006.
   */
  constructor(
    private readonly circuitBreakerProxy: CircuitBreakerProxy,
  ) {
    this.logger.log(
      'MockGpsAdapter: Circuit Breaker activado para servicio gps-service',
    );
  }

  /**
   * Semilla determinista por unidad.
   * A partir del hashCode del unidadId genera un offset
   * reproducible para que misma unidad → misma posición base.
   */
  private seedFor(unidadId: string): number {
    let hash = 0;
    for (let i = 0; i < unidadId.length; i++) {
      const char = unidadId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // convertir a Int32
    }
    return Math.abs(hash);
  }

  /**
   * Inicializa posición y estado para una unidad si no existen.
   */
  private ensureUnit(unidadId: string): void {
    if (this.positions.has(unidadId)) return;

    const seed = this.seedFor(unidadId);
    const r1 = (seed % 97) / 100; // 0.00-0.96
    const r2 = ((seed * 31) % 101) / 100; // 0.00-1.00
    const bateria = 70 + ((seed * 7) % 30); // 70-99%

    const position: GpsPosition = {
      lat: MARACAIBO_LAT + (r1 - 0.48) * POSITION_SPREAD,
      lng: MARACAIBO_LNG + (r2 - 0.5) * POSITION_SPREAD,
      timestamp: new Date(),
      velocidad: 0,
      direccion: (seed * 13) % 360,
    };

    this.positions.set(unidadId, position);
    this.statuses.set(unidadId, {
      encendido: true,
      bateria,
      conectado: Math.random() < CONNECTED_PROBABILITY,
      ultimaPosicion: position,
    });

    // Iniciar el intervalo en la primera unidad creada
    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
      this.logger.log('MockGpsAdapter: intervalo de simulación iniciado (3 s)');
    }
  }

  /**
   * Actualiza todas las posiciones y estados conocidos.
   * Se ejecuta en cada tick del intervalo.
   */
  private tick(): void {
    for (const [unidadId, pos] of this.positions.entries()) {
      const status = this.statuses.get(unidadId);
      if (!status) continue;

      // Deriva aleatoria en lat/lng
      const deltaLat = (Math.random() - 0.5) * MAX_DELTA_PER_TICK * 2;
      const deltaLng = (Math.random() - 0.5) * MAX_DELTA_PER_TICK * 2;

      const newLat = pos.lat + deltaLat;
      const newLng = pos.lng + deltaLng;

      // Velocidad: 0-80 km/h, con cierta inercia
      const newVelocidad = Math.round(
        Math.max(0, Math.min(80, pos.velocidad + (Math.random() - 0.5) * 20)),
      );

      // Dirección: cambia gradualmente
      const newDireccion =
        (pos.direccion + Math.round((Math.random() - 0.5) * 30) + 360) % 360;

      // Batería: decrece lentamente
      const newBateria = Math.max(0, Math.round(status.bateria - Math.random() * 0.5));

      // Conectividad: 95 % del tiempo conectado
      const newConectado = Math.random() < CONNECTED_PROBABILITY;

      // Encendido: rara vez se apaga
      const newEncendido = Math.random() > 0.01 ? status.encendido : !status.encendido;

      const updatedPosition: GpsPosition = {
        lat: newLat,
        lng: newLng,
        timestamp: new Date(),
        velocidad: newVelocidad,
        direccion: newDireccion,
      };

      this.positions.set(unidadId, updatedPosition);
      this.statuses.set(unidadId, {
        encendido: newEncendido,
        bateria: newBateria,
        conectado: newConectado,
        ultimaPosicion: newConectado ? updatedPosition : status.ultimaPosicion,
      });
    }
  }

  // ────────────────────────────────────────────
  //  Métodos públicos (protegidos por CB)
  // ────────────────────────────────────────────

  /**
   * Obtiene la posición actual de una unidad, protegido por
   * Circuit Breaker. Si el servicio GPS está fallando, el CB
   * rechaza la llamada rápidamente en lugar de esperar un timeout.
   */
  async getPosition(unidadId: string): Promise<GpsPosition | null> {
    return this.circuitBreakerProxy.call(
      'gps-service',
      () => this._getPosition(unidadId),
    );
  }

  /**
   * Obtiene el estado del módulo GPS de una unidad, protegido
   * por Circuit Breaker.
   */
  async getStatus(unidadId: string): Promise<GpsUnitStatus> {
    return this.circuitBreakerProxy.call(
      'gps-service',
      () => this._getStatus(unidadId),
    );
  }

  /**
   * Obtiene las últimas posiciones conocidas de todas las
   * unidades de una terminal, protegido por Circuit Breaker.
   */
  async getLastKnownPositions(
    terminalId: string,
  ): Promise<Map<string, GpsPosition>> {
    return this.circuitBreakerProxy.call(
      'gps-service',
      () => this._getLastKnownPositions(terminalId),
    );
  }

  // ────────────────────────────────────────────
  //  Métodos privados (lógica real)
  // ────────────────────────────────────────────

  /**
   * Lógica interna de getPosition (sin CB).
   */
  private async _getPosition(unidadId: string): Promise<GpsPosition | null> {
    try {
      this.ensureUnit(unidadId);
      const status = this.statuses.get(unidadId);
      // Si no está conectado, no hay posición actual
      if (!status?.conectado) return null;
      return this.positions.get(unidadId) ?? null;
    } catch (error) {
      throw new Error(
        `MockGpsAdapter.getPosition: error al obtener posición de unidad ${unidadId} — ${(error as Error).message}`,
      );
    }
  }

  /**
   * Lógica interna de getStatus (sin CB).
   */
  private async _getStatus(unidadId: string): Promise<GpsUnitStatus> {
    try {
      this.ensureUnit(unidadId);
      return this.statuses.get(unidadId)!;
    } catch (error) {
      throw new Error(
        `MockGpsAdapter.getStatus: error al obtener estado de unidad ${unidadId} — ${(error as Error).message}`,
      );
    }
  }

  /**
   * Lógica interna de getLastKnownPositions (sin CB).
   */
  private async _getLastKnownPositions(
    terminalId: string,
  ): Promise<Map<string, GpsPosition>> {
    try {
      // En modo mock, el terminal no tiene unidades asociadas
      // reales; devolvemos todas las posiciones conocidas.
      const result = new Map<string, GpsPosition>();
      for (const [unidadId, pos] of this.positions.entries()) {
        result.set(unidadId, { ...pos });
      }
      return result;
    } catch (error) {
      throw new Error(
        `MockGpsAdapter.getLastKnownPositions: error al obtener posiciones de terminal ${terminalId} — ${(error as Error).message}`,
      );
    }
  }

  /**
   * Limpia el intervalo de simulación cuando Nest destruye
   * el módulo (hot-reload en desarrollo, shutdown en prod).
   */
  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('MockGpsAdapter: intervalo de simulación detenido');
    }
  }
}
