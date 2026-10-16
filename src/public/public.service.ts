import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  EstadoAbordaje,
  EstadoDespacho,
  EstadoPago,
  MetodoPago,
} from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { Abordaje } from '../entities/abordaje.entity';
import { Despacho } from '../entities/despacho.entity';
import { Organization } from '../entities/tenant/organization.entity';
import { Pasajero } from '../entities/pasajero.entity';
import { RecuperarPasajeroDto } from './dto/recuperar-pasajero.dto';
import { RegistroPasajeroDto } from './dto/registro-pasajero.dto';

export interface PasajeroPerfil {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  foto_url: string | null;
  qr_token: string;
  creado_en: Date;
}

export interface PagoMovilPublico {
  banco: string | null;
  telefono: string | null;
  cedula_rif: string | null;
  titular: string | null;
}

export interface ViajePasajero {
  id: string;
  destino: string | null;
  linea: string | null;
  fecha: string;
  monto: number;
  moneda: string;
  metodo_pago: MetodoPago | null;
  referencia: string | null;
  estado_pago: EstadoPago;
}

export interface SalidaPublica {
  id: string;
  hora_programada: string | null;
  hora_salida: string | null;
  destino: string | null;
  linea: string | null;
  anden: number | null;
  estado: EstadoDespacho;
  capacidad: number;
  ocupacion: number;
  disponibles: number;
  duracion_estimada_min: number | null;
  /** Tarifa del pasaje para esta salida */
  tarifa: number;
  /** Derecho de salida / tasa del terminal */
  tasa_terminal: number;
  /** Total a pagar por pasajero (pasaje + tasa) */
  total: number;
  moneda: string;
  /** Datos de Pago Móvil del terminal */
  pago_movil: PagoMovilPublico | null;
}

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Pasajero)
    private readonly pasajeroRepo: Repository<Pasajero>,
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(Abordaje)
    private readonly abordajeRepo: Repository<Abordaje>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  /**
   * El registro público de pasajeros no tiene contexto de terminal, así que
   * se asocia a la primera organización activa para mantener la integridad
   * referencial (FK). Puede sobreescribirse con `organizationId`.
   */
  private async resolverOrganizacion(organizationId?: string): Promise<string> {
    if (organizationId) return organizationId;
    const org = await this.organizationRepo.findOne({
      where: { activo: true },
      order: { creado_en: 'ASC' },
    });
    if (!org) {
      throw new BadRequestException('No hay una organización activa configurada');
    }
    return org.id;
  }

  /** Convierte entidad a respuesta segura (sin datos internos extra) */
  toPerfil(p: Pasajero): PasajeroPerfil {
    return {
      id: p.id,
      cedula: p.cedula,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombre_completo: `${p.nombres} ${p.apellidos}`.trim(),
      foto_url: p.foto_url,
      qr_token: p.qr_token,
      creado_en: p.creado_en,
    };
  }

  /**
   * Registro único: si la cédula ya existe, devuelve el perfil existente
   * (el pasajero no vuelve a llenar el formulario en viajes futuros).
   */
  async registrar(
    dto: RegistroPasajeroDto,
  ): Promise<{ perfil: PasajeroPerfil; es_nuevo: boolean }> {
    const cedula = dto.cedula.trim();
    const existente = await this.pasajeroRepo.findOne({ where: { cedula } });

    if (existente) {
      if (dto.foto_url && dto.foto_url !== existente.foto_url) {
        existente.foto_url = dto.foto_url;
        await this.pasajeroRepo.save(existente);
      }
      return { perfil: this.toPerfil(existente), es_nuevo: false };
    }

    const organization_id = await this.resolverOrganizacion(
      dto.organizationId,
    );
    const pasajero = this.pasajeroRepo.create({
      cedula,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      foto_url: dto.foto_url ?? null,
      qr_token: randomUUID(),
      activo: true,
      organization_id,
    });
    const guardado = await this.pasajeroRepo.save(pasajero);
    return { perfil: this.toPerfil(guardado), es_nuevo: true };
  }

  /** Recuperar perfil en otro dispositivo solo con cédula (sin contraseña) */
  async recuperar(dto: RecuperarPasajeroDto): Promise<PasajeroPerfil> {
    const pasajero = await this.pasajeroRepo.findOne({
      where: { cedula: dto.cedula.trim(), activo: true },
    });
    if (!pasajero) {
      throw new NotFoundException('No hay registro con esa cédula');
    }
    return this.toPerfil(pasajero);
  }

  async perfilPorToken(token: string): Promise<PasajeroPerfil> {
    const pasajero = await this.pasajeroRepo.findOne({
      where: { qr_token: token, activo: true },
    });
    if (!pasajero) {
      throw new NotFoundException('Perfil de pasajero no encontrado');
    }
    return this.toPerfil(pasajero);
  }

  /** Historial de abordajes del pasajero autenticado por su QR */
  async misViajes(token: string): Promise<ViajePasajero[]> {
    const pasajero = await this.pasajeroRepo.findOne({
      where: { qr_token: token, activo: true },
    });
    if (!pasajero) {
      throw new NotFoundException('Perfil de pasajero no encontrado');
    }

    const abordajes = await this.abordajeRepo.find({
      where: { pasajero_id: pasajero.id, estado: EstadoAbordaje.ABORDADO },
      relations: { despacho: { destino: true, unidad: { linea: true } } },
      order: { escaneado_en: 'DESC' },
      take: 30,
    });

    return abordajes.map((a) => ({
      id: a.id,
      destino: a.despacho?.destino?.nombre ?? null,
      linea: a.despacho?.unidad?.linea?.nombre ?? null,
      fecha: (a.escaneado_en ?? a.creado_en).toISOString(),
      monto: a.monto,
      moneda: a.moneda,
      metodo_pago: a.metodo_pago,
      referencia: a.referencia,
      estado_pago: a.estado_pago,
    }));
  }

  /** Salidas visibles para el público, con cupos disponibles */
  async getSalidas(terminalId?: string): Promise<SalidaPublica[]> {
    const estadosVisibles = [
      EstadoDespacho.EN_COLA,
      EstadoDespacho.ASIGNADO,
      EstadoDespacho.EN_ANDEN,
      EstadoDespacho.DESPACHADO,
      EstadoDespacho.RETRASADO,
    ];

    const where: any = { estado: In(estadosVisibles) };
    if (terminalId) {
      where.terminal_id = terminalId;
    }

    const despachos = await this.despachoRepo.find({
      where,
      relations: DESPACHO_RELATIONS,
      order: { hora_programada: 'ASC', hora_asignacion: 'ASC' },
      take: 30,
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
      const tarifa = d.tarifa ?? d.destino?.tarifa ?? 0;
      const tasa = d.tasa_terminal ?? d.destino?.tasa_terminal ?? 0;
      const t = d.terminal;
      const pago_movil: PagoMovilPublico | null =
        t &&
        (t.pago_movil_banco || t.pago_movil_telefono || t.pago_movil_cedula_rif)
          ? {
              banco: t.pago_movil_banco,
              telefono: t.pago_movil_telefono,
              cedula_rif: t.pago_movil_cedula_rif,
              titular: t.pago_movil_titular,
            }
          : null;
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
        tarifa,
        tasa_terminal: tasa,
        total: tarifa + tasa,
        moneda: d.destino?.moneda ?? 'VES',
        pago_movil,
      };
    });
  }
}
