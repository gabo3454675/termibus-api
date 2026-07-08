import { Anden } from '../../entities/anden.entity';
import { Despacho } from '../../entities/despacho.entity';

export interface DispatchStrategy {
  /** Nombre legible de la estrategia (para logs y debugging) */
  readonly name: string;

  /**
   * Ordena y filtra la cola de despachos para determinar
   * qué despacho debe asignarse al siguiente andén libre.
   *
   * @param cola - Despachos en estado EN_COLA (o listos para asignar)
   * @param andenesLibres - Andenes disponibles actualmente
   * @returns Despachos ordenados según prioridad (primero = próximo en asignarse)
   */
  sortQueue(cola: Despacho[], andenesLibres: Anden[]): Despacho[];
}
