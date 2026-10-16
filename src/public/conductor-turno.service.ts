import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, MoreThan, Repository } from 'typeorm';
import {
  EstadoAbordaje,
  EstadoDespacho,
  EstadoPago,
  MetodoPago,
  OrigenAbordaje,
} from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { Abordaje } from '../entities/abordaje.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
import { Pasajero } from '../entities/pasajero.entity';
import { SesionConductor } from '../entities/sesion-conductor.entity';
import { DispatchStateMachine } from '../despachos/state-machine/dispatch-state-machine';
import { DESPACHO_EVENTS } from '../events/despacho.events';
import { PublicService, type PasajeroPerfil } from './public.service';
import { AbordajeManualDto } from './dto/abordaje-manual.dto';
import { CobrarAbordajeDto } from './dto/cobrar-abordaje.dto';

export interface PagoMovilInfo {
  banco: string | null;
  telefono: string | null;
  cedula_rif: string | null;
  titular: string | null;
}

export interface TurnoConductor {
  id: string;
  estado: EstadoDespacho;
  hora_programada: string | null;
  destino: string | null;
  linea: string | null;
  anden: number | null;
  capacidad: number;
  ocupacion: number;
  disponibles: number;
  placa: string | null;
  /** Tarifa efectiva del pasaje para este despacho */
  tarifa: number;
  moneda: string;
  /** Total recaudado (pagos PAGADO) */
  recaudado: number;
  /** Monto aún por cobrar (pagos PENDIENTE) */
  monto_pendiente: number;
  /** Cantidad de pasajeros con pago pendiente */
  pendientes_cobro: number;
  /** Datos de Pago Móvil del terminal, para cobrar en el momento */
  pago_movil: PagoMovilInfo | null;
}

export interface AbordajeResumen {
  id: string;
  escaneado_en: string;
  pasajero: PasajeroPerfil | null;
  origen: OrigenAbordaje;
  metodo_pago: MetodoPago | null;
  monto: number;
  moneda: string;
  referencia: string | null;
  estado_pago: EstadoPago;
}

interface ResumenPagos {
  recaudado: number;
  monto_pendiente: number;
  pendientes_cobro: number;
}

@Injectable()
export class ConductorTurnoService {
  constructor(
    @InjectRepository(Conductor)
    private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(SesionConductor)
    private readonly sesionRepo: Repository<SesionConductor>,
    @InjectRepository(Abordaje)
    private readonly abordajeRepo: Repository<Abordaje>,
    @InjectRepository(Pasajero)
    private readonly pasajeroRepo: Repository<Pasajero>,
    private readonly publicService: PublicService,
    private readonly stateMachine: DispatchStateMachine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private estadosActivos = [
    EstadoDespacho.EN_COLA,
    EstadoDespacho.ASIGNADO,
    EstadoDespacho.EN_ANDEN,
    EstadoDespacho.DESPACHADO,
  ];

  private tarifaEfectiva(d: Despacho): { tarifa: number; moneda: string } {
    return {
      tarifa: d.tarifa ?? d.destino?.tarifa ?? 0,
      moneda: d.destino?.moneda ?? 'VES',
    };
  }

  private mapPagoMovil(d: Despacho): PagoMovilInfo | null {
    const t = d.terminal;
    if (!t) return null;
    if (
      !t.pago_movil_banco &&
      !t.pago_movil_telefono &&
      !t.pago_movil_cedula_rif &&
      !t.pago_movil_titular
    ) {
      return null;
    }
    return {
      banco: t.pago_movil_banco,
      telefono: t.pago_movil_telefono,
      cedula_rif: t.pago_movil_cedula_rif,
      titular: t.pago_movil_titular,
    };
  }

  private mapTurno(
    d: Despacho,
    ocupacion: number,
    pagos: ResumenPagos,
  ): TurnoConductor {
    const capacidad = d.unidad?.capacidad ?? 0;
    const { tarifa, moneda } = this.tarifaEfectiva(d);
    return {
      id: d.id,
      estado: d.estado,
      hora_programada: d.hora_programada,
      destino: d.destino?.nombre ?? null,
      linea: d.unidad?.linea?.nombre ?? null,
      anden: d.anden?.numero ?? null,
      capacidad,
      ocupacion,
      disponibles: Math.max(0, capacidad - ocupacion),
      placa: d.unidad?.placa ?? null,
      tarifa,
      moneda,
      recaudado: pagos.recaudado,
      monto_pendiente: pagos.monto_pendiente,
      pendientes_cobro: pagos.pendientes_cobro,
      pago_movil: this.mapPagoMovil(d),
    };
  }

  private async contarOcupacion(despachoId: string): Promise<number> {
    return this.abordajeRepo.count({
      where: { despacho_id: despachoId, estado: EstadoAbordaje.ABORDADO },
    });
  }

  private async resumenPagos(despachoId: string): Promise<ResumenPagos> {
    const rows = await this.abordajeRepo.find({
      where: { despacho_id: despachoId, estado: EstadoAbordaje.ABORDADO },
      select: { monto: true, estado_pago: true },
    });
    let recaudado = 0;
    let monto_pendiente = 0;
    let pendientes_cobro = 0;
    for (const r of rows) {
      if (r.estado_pago === EstadoPago.PAGADO) recaudado += r.monto ?? 0;
      else if (r.estado_pago === EstadoPago.PENDIENTE) {
        monto_pendiente += r.monto ?? 0;
        pendientes_cobro++;
      }
    }
    return { recaudado, monto_pendiente, pendientes_cobro };
  }

  private parseQrToken(raw: string): string {
    const trimmed = raw.trim();
    try {
      const parsed = JSON.parse(trimmed) as { token?: string };
      if (parsed.token) return parsed.token;
    } catch {
      /* texto plano */
    }
    return trimmed;
  }

  private async validarSesion(token: string): Promise<SesionConductor> {
    const sesion = await this.sesionRepo.findOne({
      where: {
        token: token.trim(),
        activa: true,
        expira_en: MoreThan(new Date()),
      },
    });
    if (!sesion) {
      throw new UnauthorizedException(
        'Sesión de conductor inválida o expirada',
      );
    }
    return sesion;
  }

  private async cargarDespacho(despachoId: string): Promise<Despacho> {
    const despacho = await this.despachoRepo.findOne({
      where: { id: despachoId },
      relations: DESPACHO_RELATIONS,
    });
    if (!despacho) throw new NotFoundException('Turno no encontrado');
    return despacho;
  }

  /** Entrada rápida: solo cédula, sin contraseña */
  async ingresar(cedula: string) {
    const conductor = await this.conductorRepo.findOne({
      where: { cedula: cedula.trim(), activo: true },
    });
    if (!conductor) {
      throw new NotFoundException('Conductor no registrado o inactivo');
    }

    const despachos = await this.despachoRepo.find({
      where: {
        conductor_id: conductor.id,
        estado: In(this.estadosActivos),
      },
      relations: DESPACHO_RELATIONS,
    });

    const prioridadEstado: Record<string, number> = {
      [EstadoDespacho.EN_ANDEN]: 4,
      [EstadoDespacho.ASIGNADO]: 3,
      [EstadoDespacho.DESPACHADO]: 2,
      [EstadoDespacho.EN_COLA]: 1,
    };

    const despacho = despachos.sort(
      (a, b) =>
        (prioridadEstado[b.estado] ?? 0) - (prioridadEstado[a.estado] ?? 0) ||
        b.creado_en.getTime() - a.creado_en.getTime(),
    )[0];
    if (!despacho) {
      throw new NotFoundException('No tienes un turno activo en este momento');
    }

    await this.sesionRepo.update(
      { despacho_id: despacho.id, activa: true },
      { activa: false },
    );

    const sesion = await this.sesionRepo.save({
      organization_id: despacho.organization_id,
      despacho_id: despacho.id,
      conductor_id: conductor.id,
      token: randomUUID(),
      expira_en: new Date(Date.now() + 12 * 60 * 60 * 1000),
      activa: true,
    });

    const [ocupacion, pagos] = await Promise.all([
      this.contarOcupacion(despacho.id),
      this.resumenPagos(despacho.id),
    ]);

    return {
      session_token: sesion.token,
      conductor: {
        id: conductor.id,
        cedula: conductor.cedula,
        nombre_completo: `${conductor.nombres} ${conductor.apellidos}`.trim(),
      },
      turno: this.mapTurno(despacho, ocupacion, pagos),
      abordajes: await this.listarAbordajes(sesion.token),
    };
  }

  async obtenerTurno(sessionToken: string) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);
    const conductor = await this.conductorRepo.findOne({
      where: { id: sesion.conductor_id },
    });
    if (!conductor) throw new NotFoundException('Conductor no encontrado');

    const [ocupacion, pagos] = await Promise.all([
      this.contarOcupacion(despacho.id),
      this.resumenPagos(despacho.id),
    ]);

    return {
      conductor: {
        id: conductor.id,
        cedula: conductor.cedula,
        nombre_completo: `${conductor.nombres} ${conductor.apellidos}`.trim(),
      },
      turno: this.mapTurno(despacho, ocupacion, pagos),
      abordajes: await this.listarAbordajes(sessionToken),
    };
  }

  async confirmarLlegada(sessionToken: string) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);

    if (despacho.estado !== EstadoDespacho.ASIGNADO) {
      throw new BadRequestException(
        'Solo puedes confirmar cuando estás asignado a un andén',
      );
    }

    this.stateMachine.transition(despacho.estado, 'confirmar', {
      despachoId: despacho.id,
      organizationId: despacho.organization_id,
    });

    despacho.estado = EstadoDespacho.EN_ANDEN;
    await this.despachoRepo.save(despacho);

    const [ocupacion, pagos] = await Promise.all([
      this.contarOcupacion(despacho.id),
      this.resumenPagos(despacho.id),
    ]);
    const turno = this.mapTurno(despacho, ocupacion, pagos);

    this.eventEmitter.emit(DESPACHO_EVENTS.EN_ANDEN, {
      despachoId: despacho.id,
      terminalId: despacho.terminal_id,
      estado: EstadoDespacho.EN_ANDEN,
      timestamp: new Date(),
      data: turno,
    });
    this.eventEmitter.emit('conductor.confirmado', turno);

    return {
      turno,
      mensaje: 'Llegada confirmada. Ya puedes abordar pasajeros.',
    };
  }

  /**
   * Registra el abordaje por QR y, si viene método de pago, lo cobra
   * en el mismo acto. Si no, queda PENDIENTE (cobro posterior).
   */
  async escanear(
    sessionToken: string,
    qrRaw: string,
    pago?: { metodo_pago?: MetodoPago; monto?: number; referencia?: string },
  ) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);

    if (despacho.estado !== EstadoDespacho.EN_ANDEN) {
      throw new BadRequestException(
        'Abordaje solo disponible cuando el bus está en andén',
      );
    }

    const qrToken = this.parseQrToken(qrRaw);
    const pasajero = await this.pasajeroRepo.findOne({
      where: { qr_token: qrToken, activo: true },
    });
    if (!pasajero) {
      throw new BadRequestException('QR no reconocido');
    }

    const yaAbordo = await this.abordajeRepo.findOne({
      where: {
        pasajero_id: pasajero.id,
        despacho_id: despacho.id,
        estado: EstadoAbordaje.ABORDADO,
      },
    });
    if (yaAbordo) {
      throw new ConflictException(`${pasajero.nombres} ya abordó este bus`);
    }

    const ocupacion = await this.contarOcupacion(despacho.id);
    const capacidad = despacho.unidad?.capacidad ?? 0;
    if (ocupacion >= capacidad) {
      throw new BadRequestException('Bus lleno — no hay cupos disponibles');
    }

    const { tarifa, moneda } = this.tarifaEfectiva(despacho);
    const pagado = Boolean(pago?.metodo_pago);
    const monto = pago?.monto ?? tarifa;

    const abordaje = await this.abordajeRepo.save(
      this.abordajeRepo.create({
        organization_id: despacho.organization_id,
        pasajero_id: pasajero.id,
        despacho_id: despacho.id,
        estado: EstadoAbordaje.ABORDADO,
        origen: OrigenAbordaje.QR,
        escaneado_en: new Date(),
        monto,
        moneda,
        metodo_pago: pago?.metodo_pago ?? null,
        referencia: pago?.referencia ?? null,
        estado_pago: pagado ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
        pagado_en: pagado ? new Date() : null,
        cobrado_por: pagado ? sesion.conductor_id : null,
      }),
    );

    const perfil = this.publicService.toPerfil(pasajero);
    const nuevaOcupacion = ocupacion + 1;
    const pagos = await this.resumenPagos(despacho.id);

    this.eventEmitter.emit('abordaje.registrado', {
      despacho_id: despacho.id,
      terminal_id: despacho.terminal_id,
      pasajero: perfil,
      ocupacion: nuevaOcupacion,
      capacidad,
      monto,
      estado_pago: abordaje.estado_pago,
    });

    return {
      ok: true,
      abordaje_id: abordaje.id,
      pasajero: perfil,
      estado_pago: abordaje.estado_pago,
      turno: this.mapTurno(despacho, nuevaOcupacion, pagos),
      mensaje: pagado
        ? `${perfil.nombre_completo} abordó y pagó (${moneda} ${monto})`
        : `${perfil.nombre_completo} abordó — cobro pendiente`,
    };
  }

  /**
   * Registro manual (pasajeros sin app). El cobrador toca "+1" y cobra.
   * Si viene cédula y existe un pasajero, se asocia; si no, queda anónimo.
   */
  async abordajeManual(sessionToken: string, dto: AbordajeManualDto) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);

    if (despacho.estado !== EstadoDespacho.EN_ANDEN) {
      throw new BadRequestException(
        'Abordaje solo disponible cuando el bus está en andén',
      );
    }

    const cantidad = dto.cantidad ?? 1;
    const ocupacion = await this.contarOcupacion(despacho.id);
    const capacidad = despacho.unidad?.capacidad ?? 0;
    if (ocupacion + cantidad > capacidad) {
      throw new BadRequestException(
        `No hay suficientes cupos (quedan ${Math.max(0, capacidad - ocupacion)})`,
      );
    }

    let pasajero: Pasajero | null = null;
    if (dto.cedula?.trim()) {
      pasajero = await this.pasajeroRepo.findOne({
        where: { cedula: dto.cedula.trim(), activo: true },
      });
    }

    const { tarifa, moneda } = this.tarifaEfectiva(despacho);
    const pagado = Boolean(dto.metodo_pago);
    const montoUnit = dto.monto ?? tarifa;

    const nuevos: Abordaje[] = [];
    for (let i = 0; i < cantidad; i++) {
      nuevos.push(
        this.abordajeRepo.create({
          organization_id: despacho.organization_id,
          pasajero_id: pasajero && cantidad === 1 ? pasajero.id : null,
          despacho_id: despacho.id,
          estado: EstadoAbordaje.ABORDADO,
          origen: OrigenAbordaje.MANUAL,
          escaneado_en: new Date(),
          monto: montoUnit,
          moneda,
          metodo_pago: dto.metodo_pago ?? null,
          referencia: dto.referencia ?? null,
          estado_pago: pagado ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
          pagado_en: pagado ? new Date() : null,
          cobrado_por: pagado ? sesion.conductor_id : null,
        }),
      );
    }
    const guardados = await this.abordajeRepo.save(nuevos);

    const nuevaOcupacion = ocupacion + cantidad;
    const pagos = await this.resumenPagos(despacho.id);

    this.eventEmitter.emit('abordaje.registrado', {
      despacho_id: despacho.id,
      terminal_id: despacho.terminal_id,
      pasajero: pasajero ? this.publicService.toPerfil(pasajero) : null,
      ocupacion: nuevaOcupacion,
      capacidad,
      cantidad,
      monto: montoUnit * cantidad,
      estado_pago: guardados[0]?.estado_pago,
    });

    return {
      ok: true,
      cantidad,
      estado_pago: guardados[0]?.estado_pago ?? EstadoPago.PENDIENTE,
      turno: this.mapTurno(despacho, nuevaOcupacion, pagos),
      mensaje: pagado
        ? `${cantidad} pasajero(s) abordaron y pagaron`
        : `${cantidad} pasajero(s) abordaron — cobro pendiente`,
    };
  }

  /** Marca como PAGADO un abordaje que quedó pendiente (p. ej. Pago Móvil tras abordar) */
  async cobrar(
    sessionToken: string,
    abordajeId: string,
    dto: CobrarAbordajeDto,
  ) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);

    const abordaje = await this.abordajeRepo.findOne({
      where: {
        id: abordajeId,
        despacho_id: despacho.id,
        estado: EstadoAbordaje.ABORDADO,
      },
    });
    if (!abordaje)
      throw new NotFoundException('Abordaje no encontrado en tu turno');
    if (abordaje.estado_pago === EstadoPago.PAGADO) {
      throw new ConflictException('Ese abordaje ya está pagado');
    }

    abordaje.metodo_pago = dto.metodo_pago;
    abordaje.referencia = dto.referencia ?? abordaje.referencia;
    if (dto.monto != null) abordaje.monto = dto.monto;
    abordaje.estado_pago = EstadoPago.PAGADO;
    abordaje.pagado_en = new Date();
    abordaje.cobrado_por = sesion.conductor_id;
    await this.abordajeRepo.save(abordaje);

    const [ocupacion, pagos] = await Promise.all([
      this.contarOcupacion(despacho.id),
      this.resumenPagos(despacho.id),
    ]);

    return {
      ok: true,
      turno: this.mapTurno(despacho, ocupacion, pagos),
      mensaje: 'Cobro registrado',
    };
  }

  async listarAbordajes(sessionToken: string): Promise<AbordajeResumen[]> {
    const sesion = await this.validarSesion(sessionToken);
    const rows = await this.abordajeRepo.find({
      where: {
        despacho_id: sesion.despacho_id,
        estado: EstadoAbordaje.ABORDADO,
      },
      relations: { pasajero: true },
      order: { escaneado_en: 'DESC' },
    });

    return rows.map((a) => ({
      id: a.id,
      escaneado_en: a.escaneado_en?.toISOString() ?? a.creado_en.toISOString(),
      pasajero: a.pasajero ? this.publicService.toPerfil(a.pasajero) : null,
      origen: a.origen,
      metodo_pago: a.metodo_pago,
      monto: a.monto,
      moneda: a.moneda,
      referencia: a.referencia,
      estado_pago: a.estado_pago,
    }));
  }
}
