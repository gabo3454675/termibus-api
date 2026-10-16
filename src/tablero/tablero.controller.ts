import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EstadoAbordaje, EstadoDespacho } from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { Abordaje } from '../entities/abordaje.entity';
import { Despacho } from '../entities/despacho.entity';

@Controller('tablero')
@SkipThrottle()  // Opcional - para que el tablero público no tenga límite
export class TableroController {
  constructor(
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(Abordaje)
    private readonly abordajeRepo: Repository<Abordaje>,
  ) {}

  @Get()
  async getTablero(@Query('terminal') terminalId?: string) {
    const estados = [
      EstadoDespacho.ASIGNADO,
      EstadoDespacho.EN_ANDEN,
      EstadoDespacho.DESPACHADO,
    ];

    const where: any = { estado: In(estados) };
    if (terminalId) {
      where.terminal_id = terminalId;
    }

    const despachos = await this.despachoRepo.find({
      where,
      relations: DESPACHO_RELATIONS,
      order: { hora_asignacion: 'ASC' },
      take: 20,
    });

    const ids = despachos.map((d) => d.id);
    const ocupacionPorDespacho = new Map<string, number>();

    if (ids.length > 0) {
      const abordajes = await this.abordajeRepo
        .createQueryBuilder('a')
        .select('a.despacho_id', 'despacho_id')
        .addSelect('COUNT(*)', 'total')
        .where('a.despacho_id IN (:...ids)', { ids })
        .andWhere('a.estado = :estado', { estado: EstadoAbordaje.ABORDADO })
        .groupBy('a.despacho_id')
        .getRawMany<{ despacho_id: string; total: string }>();

      for (const row of abordajes) {
        ocupacionPorDespacho.set(row.despacho_id, parseInt(row.total, 10));
      }
    }

    return despachos.map((d) => {
      const capacidad = d.unidad?.capacidad ?? 0;
      const ocupacion = ocupacionPorDespacho.get(d.id) ?? 0;
      return {
        id: d.id,
        hora_programada: d.hora_programada,
        hora_salida: d.hora_salida ? d.hora_salida.toISOString() : null,
        destino: d.destino?.nombre ?? null,
        linea: d.unidad?.linea?.nombre ?? null,
        anden: d.anden?.numero ?? null,
        estado: d.estado,
        capacidad,
        ocupacion,
        disponibles: Math.max(0, capacidad - ocupacion),
        duracion_estimada_min: d.destino?.duracion_estimada_min ?? null,
        tarifa: d.tarifa ?? d.destino?.tarifa ?? 0,
        moneda: d.destino?.moneda ?? 'VES',
      };
    });
  }
}
