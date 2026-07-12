import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Rol, EstadoDespacho } from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { Despacho } from '../entities/despacho.entity';
import { Anden } from '../entities/anden.entity';
import { cleanWhere } from '../common/typeorm-utils';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.DESPACHADOR)
export class ReportesController {
  constructor(
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(Anden)
    private readonly andenRepo: Repository<Anden>,
  ) {}

  @Get('salidas')
  async salidas(
    @CurrentUser() user: { terminal_id: string },
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const from = desde ? new Date(desde) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = hasta ? new Date(`${hasta}T23:59:59`) : new Date();

    const despachos = await this.despachoRepo.find({
      where: {
        ...cleanWhere({ terminal_id: user.terminal_id }),
        estado: EstadoDespacho.DESPACHADO,
        hora_salida: Between(from, to),
      },
      relations: DESPACHO_RELATIONS,
    });

    const porLinea = new Map<string, number>();
    const porDestino = new Map<string, number>();
    const porAnden = new Map<number, number>();
    let esperaTotal = 0;
    let conEspera = 0;

    for (const d of despachos) {
      const linea = d.unidad?.linea?.nombre ?? 'Sin línea';
      porLinea.set(linea, (porLinea.get(linea) ?? 0) + 1);
      porDestino.set(d.destino.nombre, (porDestino.get(d.destino.nombre) ?? 0) + 1);
      if (d.anden?.numero) {
        porAnden.set(d.anden.numero, (porAnden.get(d.anden.numero) ?? 0) + 1);
      }
      if (d.hora_asignacion && d.creado_en) {
        esperaTotal +=
          (d.hora_asignacion.getTime() - d.creado_en.getTime()) / 60000;
        conEspera++;
      }
    }

    const andenes = await this.andenRepo.find({
      where: cleanWhere({ terminal_id: user.terminal_id }),
    });

    const andenTop = [...porAnden.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      total: despachos.length,
      tiempo_promedio_espera_min: conEspera
        ? Math.round(esperaTotal / conEspera)
        : 0,
      anden_mas_utilizado: andenTop ? { numero: andenTop[0], total: andenTop[1] } : null,
      por_linea: [...porLinea.entries()].map(([nombre, total]) => ({ nombre, total })),
      por_destino: [...porDestino.entries()].map(([nombre, total]) => ({ nombre, total })),
      por_anden: andenes.map((a) => ({
        numero: a.numero,
        total: porAnden.get(a.numero) ?? 0,
      })),
      linea_top: [...porLinea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    };
  }
}
