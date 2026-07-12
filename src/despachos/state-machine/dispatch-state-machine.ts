import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EstadoDespacho } from '../../common/enums';
import { DESPACHO_EVENTS, DespachoEstadoCambiadoPayload } from '../../events/despacho.events';

/**
 * ═══════════════════════════════════════════════════════════════
 *  Máquina de Estados de Despacho
 * ═══════════════════════════════════════════════════════════════
 *
 * HACK: La máquina emite ESTADO_CAMBIADO ANTES de que el
 *       servicio persista el cambio en BD. Esto significa que
 *       el evento podría emitirse aunque el save() falle.
 *       Para producción crítico, implementar patrón
 *       Transactional Outbox: guardar evento en la misma
 *       transacción de BD y emitir después del commit.
 *       Por ahora, como TypeORM sincroniza instantáneamente
 *       con SQLite/PostgreSQL, el riesgo es bajo pero existe.
 *
 * TODO: La columna 'evento' en DespachoAuditLog no se usa.
 *       Pasar el nombre del evento desde transition() para
 *       poblar esa columna.
 *
 * Mapa de transiciones permitidas.
 * Cada par [estado_origen, evento] → estado_destino.
 *
 * Diseño table-driven: toda la lógica de transiciones está centralizada aquí.
 * Para agregar una nueva transición, solo se modifica este mapa.
 */
const TRANSITIONS: Record<EstadoDespacho, Partial<Record<string, EstadoDespacho>>> = {
  [EstadoDespacho.EN_COLA]: {
    'asignar': EstadoDespacho.ASIGNADO,
    'cancelar': EstadoDespacho.CANCELADO,
    'retrasar': EstadoDespacho.RETRASADO,
  },
  [EstadoDespacho.ASIGNADO]: {
    'confirmar': EstadoDespacho.EN_ANDEN,
    'despachar': EstadoDespacho.DESPACHADO,
    'cancelar': EstadoDespacho.CANCELADO,
    'retrasar': EstadoDespacho.RETRASADO,
    /** Auto-transición para reasignación manual: el estado no cambia, pero se emite el evento */
    'reasignar': EstadoDespacho.ASIGNADO,
  },
  [EstadoDespacho.EN_ANDEN]: {
    'despachar': EstadoDespacho.DESPACHADO,
    'cancelar': EstadoDespacho.CANCELADO,
    'retrasar': EstadoDespacho.RETRASADO,
  },
  [EstadoDespacho.DESPACHADO]: {
    'salida_ruta': EstadoDespacho.EN_RUTA,
    'completar': EstadoDespacho.COMPLETADO,
  },
  [EstadoDespacho.EN_RUTA]: {
    'completar': EstadoDespacho.COMPLETADO,
  },
  [EstadoDespacho.RETRASADO]: {
    'reasignar': EstadoDespacho.EN_COLA,
    'cancelar': EstadoDespacho.CANCELADO,
  },
  [EstadoDespacho.CANCELADO]: {},   // Estado final: sin transiciones
  [EstadoDespacho.COMPLETADO]: {},  // Estado final: sin transiciones
};

/**
 * Máquina de Estados Formal para el ciclo de vida del despacho.
 *
 * Responsabilidades:
 * 1. Validar que una transición (estado_actual, evento) sea legal
 * 2. Emitir el evento `DESPACHO_EVENTS.ESTADO_CAMBIADO` cuando la transición es válida
 * 3. Proporcionar métodos de consulta (`canTransition`, `getAllowedTransitions`)
 *
 * NO persiste el nuevo estado — eso es responsabilidad del llamador.
 * NO contiene lógica de negocio adicional (asignación de andenes, etc.).
 */
@Injectable()
export class DispatchStateMachine {
  private readonly logger = new Logger(DispatchStateMachine.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Valida y ejecuta una transición de estado.
   *
   * @param estadoActual - Estado en el que se encuentra el despacho
   * @param evento - Nombre del evento que dispara la transición
   * @param context - Contexto de la transición (despachoId, usuarioId, razon)
   * @returns El nuevo estado si la transición es válida
   * @throws BadRequestException si la transición no está permitida
   *
   * @example
   * ```typescript
   * const nuevoEstado = stateMachine.transition(
   *   despacho.estado,
   *   'cancelar',
   *   { despachoId: despacho.id, usuarioId: user.id, razon: 'Fallo mecánico' },
   * );
   * ```
   */
  transition(
    estadoActual: EstadoDespacho,
    evento: string,
    context: {
      despachoId: string;
      organizationId: string;
      usuarioId?: string;
      razon?: string;
    },
  ): EstadoDespacho {
    const estadoSiguiente = TRANSITIONS[estadoActual]?.[evento];

    if (!estadoSiguiente) {
      const permitidos = Object.keys(TRANSITIONS[estadoActual] ?? {});
      throw new BadRequestException(
        `Transición inválida: no se puede aplicar "${evento}" al estado "${estadoActual}". ` +
        `Transiciones permitidas desde "${estadoActual}": ${permitidos.join(', ') || 'ninguna (estado final)'}.`,
      );
    }

    // Emitir evento de cambio de estado
    const payload: DespachoEstadoCambiadoPayload = {
      despachoId: context.despachoId,
      organizationId: context.organizationId,
      estadoAnterior: estadoActual,
      estadoNuevo: estadoSiguiente,
      timestamp: new Date(),
      usuarioId: context.usuarioId,
      razon: context.razon,
    };

    this.eventEmitter.emit(DESPACHO_EVENTS.ESTADO_CAMBIADO, payload);

    this.logger.log(
      `[${context.despachoId}] ${estadoActual} → ${estadoSiguiente} (${evento})`,
    );

    return estadoSiguiente;
  }

  /**
   * Devuelve los eventos (transiciones) permitidos desde un estado.
   * Útil para construir menús dinámicos o documentar la máquina.
   */
  getAllowedTransitions(estado: EstadoDespacho): string[] {
    return Object.keys(TRANSITIONS[estado] ?? {});
  }

  /**
   * Verifica si una transición es válida sin ejecutarla ni emitir eventos.
   */
  canTransition(estadoActual: EstadoDespacho, evento: string): boolean {
    return !!TRANSITIONS[estadoActual]?.[evento];
  }
}
