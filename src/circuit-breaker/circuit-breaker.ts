/**
 * ═══════════════════════════════════════════════════════════════
 *  Circuit Breaker
 * ═══════════════════════════════════════════════════════════════
 *
 * HACK: En CLOSED, el contador de fallos NO se resetea en cada
 *       éxito por decisión de diseño (ver ADR-006). Si se necesita
 *       conteo de fallos consecutivos estrictos, cambiar el reset
 *       a ocurrir solo después de superar successThreshold en
 *       HALF_OPEN.
 *
 * TODO: Implementar sliding window para el conteo de fallos:
 *       en lugar de contador acumulativo, usar ventana de tiempo
 *       (ej: 3 fallos en los últimos 30 segundos). Esto evita que
 *       un fallo aislado hace 29s + otro ahora abra el circuito.
 *
 * ─────────────────────────────────────────────────────────────
 * CircuitBreaker — State machine thread-safe
 *
 * Implementación del patrón Circuit Breaker (Nygard, 2007).
 *
 * Node.js es single-thread gracias a su event loop, por lo que
 * no se necesitan mutex/locks: todas las mutaciones de estado
 * ocurren en el mismo hilo de forma atómica.
 *
 * Estados y transiciones:
 *
 *   ┌──────────┐    fallos >= threshold     ┌──────────┐
 *   │  CLOSED  │ ──────────────────────────→ │   OPEN   │
 *   └──────────┘                             └──────────┘
 *        ↑                                        │
 *        │                              timeout    │
 *        │                               vencido   │
 *        │                                        ↓
 *   ┌──────────┐    éxito en HALF_OPEN    ┌──────────┐
 *   │  CLOSED  │ ←────────────────────── │ HALF_OPEN │
 *   └──────────┘                          └──────────┘
 *                                              │
 *                                   fallo en   │
 *                                   HALF_OPEN  │
 *                                              ↓
 *                                         ┌──────────┐
 *                                         │   OPEN   │
 *                                         └──────────┘
 *
 * ¿Por qué resetear contadores al cerrar?
 *   - Porque si el servicio se recuperó, los fallos anteriores
 *     ya no son relevantes. Un nuevo ciclo de fallos empezará
 *     desde cero.
 *
 * ¿Por qué NO contar CircuitBreakerOpenException como fallo?
 *   - Es una excepción del propio CB, no del servicio externo.
 *     Si contara, cada llamada rechazada incrementaría el
 *     contador de fallos, lo que alargaría artificialmente
 *     el estado OPEN sin que el servicio esté fallando más.
 * ─────────────────────────────────────────────────────────────
 */

import { Logger } from '@nestjs/common';
import {
  CircuitState,
  type CircuitBreakerConfig,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker-state';
import { CircuitBreakerOpenException } from './circuit-breaker.exception';

/**
 * Log prefix para identificar el breaker en los logs.
 * Ejemplo: `[CircuitBreaker:gps-service]`
 */
const LOG_PREFIX = 'CircuitBreaker';

export class CircuitBreaker {
  private _state: CircuitState = CircuitState.CLOSED;
  private _failureCount = 0;
  private _successCount = 0;
  private _lastFailureTime = 0;

  /** Configuración fusionada (defaults + overrides) */
  private readonly config: Required<CircuitBreakerConfig>;

  /** Logger scoped al nombre del servicio */
  private readonly logger: Logger;

  /**
   * @param name  Nombre único del servicio protegido (ej: 'gps-service')
   * @param config  Configuración opcional (parcial). Los valores
   *                no especificados toman los defaults.
   */
  constructor(
    readonly name: string,
    config?: Partial<CircuitBreakerConfig>,
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.logger = new Logger(`${LOG_PREFIX}:${this.name}`);

    this.logger.log(
      `Inicializado: umbral_fallos=${this.config.failureThreshold}, ` +
        `umbral_exitos=${this.config.successThreshold}, ` +
        `timeout=${this.config.timeout}ms, ` +
        `ventana=${this.config.resetTimeout}ms`,
    );
  }

  /**
   * Estado actual del circuito.
   * Thread-safe por diseño (solo lectura).
   */
  getState(): CircuitState {
    return this._state;
  }

  /**
   * Contador actual de fallos consecutivos.
   * Útil para monitoreo y health checks.
   */
  get failureCount(): number {
    return this._failureCount;
  }

  /**
   * Contador actual de éxitos consecutivos (relevante en HALF_OPEN).
   */
  get successCount(): number {
    return this._successCount;
  }

  /**
   * Ejecuta `fn()` bajo la protección del Circuit Breaker.
   *
   * @param fn  Función asíncrona a proteger (ej: llamada HTTP al GPS).
   * @returns   El resultado de `fn()` si el circuito lo permite.
   * @throws    {@link CircuitBreakerOpenException} si el circuito está OPEN.
   * @throws    Error de `fn()` si el circuito estaba CLOSED o HALF_OPEN
   *            y la ejecución falló.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    switch (this._state) {
      case CircuitState.CLOSED:
        return this.handleClosed(fn);

      case CircuitState.OPEN:
        return this.handleOpen(fn);

      case CircuitState.HALF_OPEN:
        return this.handleHalfOpen(fn);

      default:
        throw new Error(`CircuitBreaker [${this.name}]: estado desconocido — ${this._state}`);
    }
  }

  // ────────────────────────────────────────
  //  Handlers de estado (privados)
  // ────────────────────────────────────────

  /**
   * CLOSED: ejecuta la función. Si falla, incrementa el contador.
   * Si el contador alcanza el umbral, abre el circuito.
   */
  private async handleClosed<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      // ADR-006: los fallos deben ser consecutivos.
      // Si hay un éxito, se resetea el contador.
      this._failureCount = 0;
      return result;
    } catch (error) {
      this._failureCount++;
      this.logger.warn(
        `Fallo #${this._failureCount}/${this.config.failureThreshold} ` +
          `— ${(error as Error).message}`,
      );

      if (this._failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN, `umbral de fallos alcanzado`);
      }
      throw error; // Re-lanzamos para que el llamador también sepa del error
    }
  }

  /**
   * OPEN: verifica si el timeout ya venció.
   *   - Si no: lanza CircuitBreakerOpenException.
   *   - Si sí: transiciona a HALF_OPEN y ejecuta.
   */
  private async handleOpen<T>(fn: () => Promise<T>): Promise<T> {
    const elapsed = Date.now() - this._lastFailureTime;

    if (elapsed <= this.config.timeout) {
      const retryAfterMs = this.config.timeout - elapsed;
      throw new CircuitBreakerOpenException(this.name, retryAfterMs);
    }

    // Timeout vencido → probar recuperación
    this.transitionTo(CircuitState.HALF_OPEN, `timeout ${this.config.timeout}ms vencido`);
    return this.handleHalfOpen(fn);
  }

  /**
   * HALF_OPEN: ejecuta la función de prueba.
   *   - Éxito → incrementa successCount. Si alcanza umbral → CLOSED.
   *   - Fallo → vuelve a OPEN.
   */
  private async handleHalfOpen<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this._successCount++;

      if (this._successCount >= this.config.successThreshold) {
        this.reset();
        this.logger.log(
          `Estado cambiado: HALF_OPEN → CLOSED (${this._successCount} éxitos consecutivos)`,
        );
      }
      return result;
    } catch (error) {
      // Fallo en HALF_OPEN → el servicio aún no se recuperó
      this.transitionTo(
        CircuitState.OPEN,
        `fallo en HALF_OPEN — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // ────────────────────────────────────────
  //  Gestión de estado
  // ────────────────────────────────────────

  /**
   * Transiciona a un nuevo estado, registrando el cambio en log.
   */
  private transitionTo(newState: CircuitState, reason: string): void {
    const oldState = this._state;
    this._state = newState;

    if (newState === CircuitState.OPEN) {
      this._lastFailureTime = Date.now();
      this._successCount = 0; // Limpia el contador de HALF_OPEN
    }

    this.logger.warn(
      `Estado cambiado: ${oldState} → ${newState} ` +
        `(${this._failureCount} fallos en ${this.config.resetTimeout / 1000}s) — ${reason}`,
    );
  }

  /**
   * Resetea el Circuit Breaker a su estado inicial (CLOSED).
   *
   * Útil para:
   *   - Testing.
   *   - Reinicio manual desde un endpoint de administración.
   *   - Curado forzado cuando se sabe que el servicio ya se recuperó.
   */
  reset(): void {
    this._state = CircuitState.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._lastFailureTime = 0;
  }
}
