import { Injectable } from '@nestjs/common';
import { DispatchStrategy } from './dispatch-strategy.interface';
import { Anden } from '../../entities/anden.entity';
import { Despacho } from '../../entities/despacho.entity';

@Injectable()
export class FifoDispatchStrategy implements DispatchStrategy {
  readonly name = 'fifo';

  /**
   * Estrategia por defecto: orden de llegada + prioridad manual.
   *
   * ¿Por qué prioridad primero?
   *   - Un despachador puede marcar un despacho como prioritario
   *     (prioridad = -1) para saltarse la cola (ej: ambulancia).
   *   - Luego se ordena por hora de creación (FIFO puro).
   */
  sortQueue(cola: Despacho[], _andenesLibres: Anden[]): Despacho[] {
    return [...cola].sort((a, b) => {
      // Prioridad: valores más bajos primero (-1 = prioritario)
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      // FIFO: más antiguo primero
      return a.creado_en.getTime() - b.creado_en.getTime();
    });
  }
}
