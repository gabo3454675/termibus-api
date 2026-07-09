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
import { EstadoAbordaje, EstadoDespacho } from '../common/enums';
import { DESPACHO_RELATIONS } from '../common/relations';
import { Abordaje } from '../entities/abordaje.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
import { Pasajero } from '../entities/pasajero.entity';
import { SesionConductor } from '../entities/sesion-conductor.entity';
import { DispatchStateMachine } from '../despachos/state-machine/dispatch-state-machine';
import { DESPACHO_EVENTS } from '../events/despacho.events';
import { PublicService, type PasajeroPerfil } from './public.service';

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
}

export interface AbordajeResumen {
  id: string;
  escaneado_en: string;
  pasajero: PasajeroPerfil;
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

  private mapTurno(d: Despacho, ocupacion: number): TurnoConductor {
    const capacidad = d.unidad?.capacidad ?? 0;
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
    };
  }

  private async contarOcupacion(despachoId: string): Promise<number> {
    return this.abordajeRepo.count({
      where: { despacho_id: despachoId, estado: EstadoAbordaje.ABORDADO },
    });
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
      throw new UnauthorizedException('Sesión de conductor inválida o expirada');
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
      despacho_id: despacho.id,
      conductor_id: conductor.id,
      token: randomUUID(),
      expira_en: new Date(Date.now() + 12 * 60 * 60 * 1000),
      activa: true,
    });

    const ocupacion = await this.contarOcupacion(despacho.id);
    const abordajes = await this.listarAbordajes(sesion.token);

    return {
      session_token: sesion.token,
      conductor: {
        id: conductor.id,
        cedula: conductor.cedula,
        nombre_completo: `${conductor.nombres} ${conductor.apellidos}`.trim(),
      },
      turno: this.mapTurno(despacho, ocupacion),
      abordajes,
    };
  }

  async obtenerTurno(sessionToken: string) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);
    const ocupacion = await this.contarOcupacion(despacho.id);
    const conductor = await this.conductorRepo.findOne({
      where: { id: sesion.conductor_id },
    });
    if (!conductor) throw new NotFoundException('Conductor no encontrado');

    return {
      conductor: {
        id: conductor.id,
        cedula: conductor.cedula,
        nombre_completo: `${conductor.nombres} ${conductor.apellidos}`.trim(),
      },
      turno: this.mapTurno(despacho, ocupacion),
      abordajes: await this.listarAbordajes(sessionToken),
    };
  }

  async confirmarLlegada(sessionToken: string) {
    const sesion = await this.validarSesion(sessionToken);
    const despacho = await this.cargarDespacho(sesion.despacho_id);

    if (despacho.estado !== EstadoDespacho.ASIGNADO) {
      throw new BadRequestException('Solo puedes confirmar cuando estás asignado a un andén');
    }

    this.stateMachine.transition(despacho.estado, 'confirmar', {
      despachoId: despacho.id,
    });

    despacho.estado = EstadoDespacho.EN_ANDEN;
    await this.despachoRepo.save(despacho);

    const ocupacion = await this.contarOcupacion(despacho.id);
    const turno = this.mapTurno(despacho, ocupacion);

    this.eventEmitter.emit(DESPACHO_EVENTS.EN_ANDEN, {
      despachoId: despacho.id,
      terminalId: despacho.terminal_id,
      estado: EstadoDespacho.EN_ANDEN,
      timestamp: new Date(),
      data: turno,
    });
    this.eventEmitter.emit('conductor.confirmado', turno);

    return { turno, mensaje: 'Llegada confirmada. Ya puedes abordar pasajeros.' };
  }

  async escanear(sessionToken: string, qrRaw: string) {
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

    const abordaje = await this.abordajeRepo.save({
      pasajero_id: pasajero.id,
      despacho_id: despacho.id,
      estado: EstadoAbordaje.ABORDADO,
      escaneado_en: new Date(),
    });

    const perfil = this.publicService.toPerfil(pasajero);
    const nuevaOcupacion = ocupacion + 1;

    this.eventEmitter.emit('abordaje.registrado', {
      despacho_id: despacho.id,
      terminal_id: despacho.terminal_id,
      pasajero: perfil,
      ocupacion: nuevaOcupacion,
      capacidad,
    });

    return {
      ok: true,
      abordaje_id: abordaje.id,
      pasajero: perfil,
      turno: this.mapTurno(despacho, nuevaOcupacion),
      mensaje: `${perfil.nombre_completo} abordó correctamente`,
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
      pasajero: this.publicService.toPerfil(a.pasajero),
    }));
  }
}
