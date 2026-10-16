import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  Rol,
  EstadoAbordaje,
  EstadoDespacho,
  EstadoPago,
} from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { Despacho } from '../entities/despacho.entity';
import { Anden } from '../entities/anden.entity';
import { Abordaje } from '../entities/abordaje.entity';
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
    @InjectRepository(Abordaje)
    private readonly abordajeRepo: Repository<Abordaje>,
  ) {}

  @Get('salidas')
  async salidas(
    @CurrentUser() user: { terminal_id: string },
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const from = desde
      ? new Date(desde)
      : new Date(new Date().setHours(0, 0, 0, 0));
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
      porDestino.set(
        d.destino.nombre,
        (porDestino.get(d.destino.nombre) ?? 0) + 1,
      );
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

    // ─── Recaudación de pasajes ────────────────────────────────
    const porMetodo = new Map<string, { total: number; monto: number }>();
    let pasajerosAbordados = 0;
    let montoRecaudado = 0;
    let montoPendiente = 0;
    let pagosPendientes = 0;

    const despachoIds = despachos.map((d) => d.id);
    if (despachoIds.length > 0) {
      const abordajes = await this.abordajeRepo.find({
        where: {
          despacho_id: In(despachoIds),
          estado: EstadoAbordaje.ABORDADO,
        },
      });
      pasajerosAbordados = abordajes.length;
      for (const a of abordajes) {
        if (a.estado_pago === EstadoPago.PAGADO) {
          montoRecaudado += a.monto ?? 0;
          const key = a.metodo_pago ?? 'SIN_METODO';
          const acc = porMetodo.get(key) ?? { total: 0, monto: 0 };
          acc.total++;
          acc.monto += a.monto ?? 0;
          porMetodo.set(key, acc);
        } else if (a.estado_pago === EstadoPago.PENDIENTE) {
          montoPendiente += a.monto ?? 0;
          pagosPendientes++;
        }
      }
    }

    return {
      total: despachos.length,
      tiempo_promedio_espera_min: conEspera
        ? Math.round(esperaTotal / conEspera)
        : 0,
      anden_mas_utilizado: andenTop
        ? { numero: andenTop[0], total: andenTop[1] }
        : null,
      por_linea: [...porLinea.entries()].map(([nombre, total]) => ({
        nombre,
        total,
      })),
      por_destino: [...porDestino.entries()].map(([nombre, total]) => ({
        nombre,
        total,
      })),
      por_anden: andenes.map((a) => ({
        numero: a.numero,
        total: porAnden.get(a.numero) ?? 0,
      })),
      linea_top:
        [...porLinea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      // Recaudación
      pasajeros_abordados: pasajerosAbordados,
      monto_recaudado: Number(montoRecaudado.toFixed(2)),
      monto_pendiente: Number(montoPendiente.toFixed(2)),
      pagos_pendientes: pagosPendientes,
      por_metodo_pago: [...porMetodo.entries()].map(([metodo, v]) => ({
        metodo,
        total: v.total,
        monto: Number(v.monto.toFixed(2)),
      })),
    };
  }
}
