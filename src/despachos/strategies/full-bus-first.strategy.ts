import { Injectable } from '@nestjs/common';
import { DispatchStrategy } from './dispatch-strategy.interface';
import { Anden } from '../../entities/anden.entity';
import { Despacho } from '../../entities/despacho.entity';
import { TipoUnidad } from '../../common/enums';

@Injectable()
export class FullBusFirstStrategy implements DispatchStrategy {
  readonly name = 'full-bus-first';

  /**
   * Prioriza unidades tipo BUS sobre MICROBUS sobre VAN.
   *
   * ¿Por qué no requerir "capacidad" como campo?
   *   - Por ahora el tipo de unidad es suficiente para dar
   *     prioridad. En el futuro se puede migrar a un campo
   *     `capacidad_maxima` en la entidad Unidad.
   */
  sortQueue(cola: Despacho[], _andenesLibres: Anden[]): Despacho[] {
    const tipoPeso: Record<string, number> = {
      [TipoUnidad.BUS]: 0,
      [TipoUnidad.MICROBUS]: 1,
      [TipoUnidad.VAN]: 2,
    };

    return [...cola].sort((a, b) => {
      const pesoA = tipoPeso[a.unidad?.tipo] ?? 99;
      const pesoB = tipoPeso[b.unidad?.tipo] ?? 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      // Desempate FIFO
      return a.creado_en.getTime() - b.creado_en.getTime();
    });
  }
}
