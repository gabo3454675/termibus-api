import { Injectable } from '@nestjs/common';
import { DispatchStrategy } from './dispatch-strategy.interface';
import { Anden } from '../../entities/anden.entity';
import { Despacho } from '../../entities/despacho.entity';

@Injectable()
export class LinePriorityStrategy implements DispatchStrategy {
  readonly name = 'line-priority';

  /**
   * Prioriza líneas con mayor frecuencia de salida primero.
   *
   * La prioridad de línea se lee de `unidad.linea.prioridad`
   * (campo a agregar en el futuro en LineaTransporte).
   * Por ahora, usa el orden alfabético de nombre de línea
   * como proxy de prioridad.
   *
   * TODO: Cuando LineaTransporte tenga campo `prioridad`,
   *       reemplazar orden alfabético por ese campo.
   */
  sortQueue(cola: Despacho[], _andenesLibres: Anden[]): Despacho[] {
    return [...cola].sort((a, b) => {
      const lineaA = a.unidad?.linea?.nombre ?? '';
      const lineaB = b.unidad?.linea?.nombre ?? '';
      if (lineaA !== lineaB) return lineaA.localeCompare(lineaB);
      // Desempate: prioridad manual + FIFO
      if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
      return a.creado_en.getTime() - b.creado_en.getTime();
    });
  }
}
