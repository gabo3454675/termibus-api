export const UNIDAD_EVENTS = {
  ESTADO_CAMBIADO: 'unidad.estado.cambiado',
} as const;

export interface UnidadEstadoCambiadoPayload {
  unidadId: string;
  estadoAnterior: string;
  estadoNuevo: string;
}
