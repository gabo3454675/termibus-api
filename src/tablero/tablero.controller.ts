import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EstadoDespacho } from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { Despacho } from '../entities/despacho.entity';

@Controller('tablero')
@SkipThrottle()  // Opcional - para que el tablero público no tenga límite
export class TableroController {
  constructor(
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
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

    return despachos.map((d) => ({
      id: d.id,
      hora_programada: d.hora_programada,
      destino: d.destino?.nombre,
      linea: d.unidad?.linea?.nombre,
      anden: d.anden?.numero ?? null,
      estado: d.estado,
    }));
  }
}
