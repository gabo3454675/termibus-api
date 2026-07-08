/** @event Será implementado cuando la State Machine (TASK-006) gestione estos estados */
export const DESPACHO_EVENTS = {
  CREATED: 'despacho.created',
  ASIGNADO: 'despacho.asignado',
  EN_ANDEN: 'despacho.en_anden',
  DESPACHADO: 'despacho.despachado',
  /** @event TASK-006: implementar con máquina de estados */
  COMPLETADO: 'despacho.completado',
  CANCELADO: 'despacho.cancelado',
  /** @event TASK-006: implementar con máquina de estados */
  RETRASADO: 'despacho.retrasado',
  /** @event TASK-003: se emite desde asignarManual() */
  REASIGNADO: 'despacho.reasignado',
  ESTADO_CAMBIADO: 'despacho.estado.cambiado',
} as const;

export interface DespachoEventPayload {
  despachoId: string;
  terminalId: string;
  estado: string;
  timestamp: Date;
  usuarioId?: string;
  data?: unknown;
}

export interface DespachoEstadoCambiadoPayload {
  despachoId: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  timestamp: Date;
  usuarioId?: string;
  razon?: string;
}
