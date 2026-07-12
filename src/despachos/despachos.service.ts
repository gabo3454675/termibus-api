import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { EstadoAnden, EstadoDespacho, EstadoUnidad } from '../common/enums';
import { DESPACHO_RELATIONS, UNIDAD_LINEA_REL } from '../common/relations';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { Terminal } from '../entities/terminal.entity';
import { Unidad } from '../entities/unidad.entity';
import { DESPACHO_EVENTS } from '../events/despacho.events';
import { UNIDAD_EVENTS } from '../events/unidad.events';
import { AuditLogService } from './audit-log.service';
import { DispatchStateMachine } from './state-machine/dispatch-state-machine';
import type { DispatchStrategy } from './strategies/dispatch-strategy.interface';
import { RecursoNoEncontradoError, UnidadNoDisponibleError, AndenNoDisponibleError } from '../common/errors';
import { cleanWhere } from '../common/typeorm-utils';

/**
 * ═══════════════════════════════════════════════════════════════
 *  Servicio de Despachos
 * ═══════════════════════════════════════════════════════════════
 *
 * WARN: La auto-asignación de andenes (asignarAndenesLibres) se
 *       ejecuta después de cada creación y despacho. Si hay muchos
 *       despachos concurrentes, pueden generarse condiciones de
 *       carrera. TypeORM maneja esto con transacciones, pero en
 *       alta concurrencia (>100 despachos/min) se recomienda
 *       migrar a cola con rabbitmq o usar SELECT ... FOR UPDATE.
 *
 * TODO: Implementar transacción atómica en asignarInterno() para
 *       evitar que dos andenes se asignen al mismo despacho.
 *       Actualmente el riesgo es bajo porque NestJS maneja las
 *       peticiones secuencialmente por el event loop.
 *
 * HACK: La estrategia de despacho se resuelve en el módulo.
 *       Si se necesita cambiar en runtime (sin reiniciar), migrar
 *       a patrón Strategy con almacenamiento en BD.
 */
@Injectable()
export class DespachosService {
  private readonly logger = new Logger(DespachosService.name);

  constructor(
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(Anden)
    private readonly andenRepo: Repository<Anden>,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
    private readonly eventEmitter: EventEmitter2,
    @Inject('DISPATCH_STRATEGY')
    private readonly dispatchStrategy: DispatchStrategy,
    private readonly stateMachine: DispatchStateMachine,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  private mapDespacho(d: Despacho, posicion?: number) {
    return {
      id: d.id,
      unidad: d.unidad
        ? { placa: d.unidad.placa, tipo: d.unidad.tipo }
        : undefined,
      conductor: d.conductor
        ? {
            nombres: d.conductor.nombres,
            apellidos: d.conductor.apellidos,
            cedula: d.conductor.cedula,
          }
        : undefined,
      anden: d.anden ? { numero: d.anden.numero, id: d.anden.id } : null,
      destino: d.destino ? { nombre: d.destino.nombre } : undefined,
      linea: d.unidad?.linea ? { nombre: d.unidad.linea.nombre } : undefined,
      hora_programada: d.hora_programada,
      hora_asignacion: d.hora_asignacion?.toISOString() ?? null,
      hora_salida: d.hora_salida?.toISOString() ?? null,
      estado: d.estado,
      prioridad: d.prioridad,
      creado_en: d.creado_en.toISOString(),
      posicion_cola: posicion,
      unidad_id: d.unidad_id,
      conductor_id: d.conductor_id,
      anden_id: d.anden_id,
      destino_id: d.destino_id,
    };
  }

  async findAll(terminalId: string, estado?: EstadoDespacho) {
    const where: Record<string, unknown> = {};
    if (terminalId) where.terminal_id = terminalId;
    if (estado) where.estado = estado;

    const list = await this.despachoRepo.find({
      where: cleanWhere(where),
      relations: DESPACHO_RELATIONS,
      order: { creado_en: 'DESC' },
    });

    const cola = this.dispatchStrategy.sortQueue(
      list.filter((d) => d.estado === EstadoDespacho.EN_COLA),
      [],
    );

    return list.map((d) => {
      const pos = cola.findIndex((c) => c.id === d.id);
      return this.mapDespacho(d, pos >= 0 ? pos + 1 : undefined);
    });
  }

  async findForConductor(conductorId: string) {
    const activos = [
      EstadoDespacho.EN_COLA,
      EstadoDespacho.ASIGNADO,
      EstadoDespacho.EN_ANDEN,
      EstadoDespacho.DESPACHADO,
    ];
    const d = await this.despachoRepo.findOne({
      where: { conductor_id: conductorId, estado: In(activos) },
      relations: DESPACHO_RELATIONS,
      order: { creado_en: 'DESC' },
    });
    return d ? this.mapDespacho(d) : null;
  }

  async create(
    terminalId: string,
    data: {
      unidad_id: string;
      conductor_id: string;
      destino_id: string;
      hora_programada?: string;
    },
    creadoPor?: string,
  ) {
    const unidad = await this.unidadRepo.findOne({
      where: { id: data.unidad_id },
      relations: UNIDAD_LINEA_REL,
    });
    if (!unidad) {
      throw new RecursoNoEncontradoError('Unidad', data.unidad_id);
    }
    if (unidad.estado !== EstadoUnidad.DISPONIBLE) {
      throw new UnidadNoDisponibleError(data.unidad_id, unidad.estado);
    }

    const terminal = await this.terminalRepo.findOne({ where: { id: terminalId } });
    if (!terminal) {
      throw new RecursoNoEncontradoError('Terminal', terminalId);
    }

    const despacho = this.despachoRepo.create({
      ...data,
      organization_id: terminal.organization_id,
      terminal_id: terminalId,
      estado: EstadoDespacho.EN_COLA,
      creado_por: creadoPor ?? null,
      prioridad: 0,
    });
    const saved = await this.despachoRepo.save(despacho);
    const full = await this.despachoRepo.findOne({
      where: { id: saved.id },
      relations: DESPACHO_RELATIONS,
    });
    if (!full) throw new RecursoNoEncontradoError('Despacho', saved.id);

    const mapped = this.mapDespacho(full);

    this.eventEmitter.emit(DESPACHO_EVENTS.CREATED, {
      despachoId: saved.id,
      terminalId,
      estado: EstadoDespacho.EN_COLA,
      timestamp: new Date(),
      data: mapped,
    });

    this.eventEmitter.emit(DESPACHO_EVENTS.ESTADO_CAMBIADO, {
      despachoId: saved.id,
      organizationId: terminal.organization_id,
      estadoAnterior: null,
      estadoNuevo: EstadoDespacho.EN_COLA,
      timestamp: new Date(),
    });

    await this.asignarAndenesLibres(terminalId);
    return mapped;
  }

  async asignarAndenesLibres(terminalId: string) {
    const andenesLibres = await this.andenRepo.find({
      where: { terminal_id: terminalId, estado: EstadoAnden.LIBRE },
      order: { numero: 'ASC' },
    });

    const cola = await this.despachoRepo.find({
      where: { terminal_id: terminalId, estado: EstadoDespacho.EN_COLA },
      order: { prioridad: 'ASC', creado_en: 'ASC' },
      relations: DESPACHO_RELATIONS,
    });

    // ✅ Usar la estrategia para ordenar la cola
    const colaOrdenada = this.dispatchStrategy.sortQueue(cola, andenesLibres);

    const asignados = [];
    for (const anden of andenesLibres) {
      if (!colaOrdenada.length) break;
      const despacho = colaOrdenada.shift()!;
      const result = await this.asignarInterno(despacho, anden);
      asignados.push(result);
    }
    return asignados;
  }

  private async asignarInterno(despacho: Despacho, anden: Anden) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar que el andén sigue libre dentro de la transacción
      const isPostgres = this.dataSource.options.type === 'postgres';
      const findOptions: any = { where: { id: anden.id } };
      if (isPostgres) {
        findOptions.lock = { mode: 'pessimistic_write' };
      }
      const andenActual = await queryRunner.manager.findOne(Anden, findOptions);
      if (!andenActual || andenActual.estado !== EstadoAnden.LIBRE) {
        throw new AndenNoDisponibleError(anden.id, andenActual?.estado ?? 'NO_ENCONTRADO');
      }

      const estadoAnterior = despacho.estado;
      despacho.anden_id = anden.id;
      despacho.anden = anden;
      despacho.estado = EstadoDespacho.ASIGNADO;
      despacho.hora_asignacion = new Date();
      anden.estado = EstadoAnden.OCUPADO;

      await queryRunner.manager.save(Anden, anden);
      const saved = await queryRunner.manager.save(Despacho, despacho);

      await queryRunner.commitTransaction();

      // Después de la transacción, emitir eventos (fuera del lock)
      const full = await this.despachoRepo.findOne({
        where: { id: saved.id },
        relations: DESPACHO_RELATIONS,
      });
      if (!full) throw new RecursoNoEncontradoError('Despacho', saved.id);

      if (estadoAnterior !== EstadoDespacho.ASIGNADO) {
        this.stateMachine.transition(estadoAnterior, 'asignar', {
          despachoId: full.id,
          organizationId: full.organization_id,
        });
      }

      const mapped = this.mapDespacho(full);
      this.eventEmitter.emit('anden.updated', { anden, despacho: mapped });
      this.eventEmitter.emit(DESPACHO_EVENTS.ASIGNADO, {
        despachoId: saved.id,
        terminalId: saved.terminal_id,
        estado: EstadoDespacho.ASIGNADO,
        timestamp: new Date(),
        data: mapped,
      });

      return mapped;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async asignarManual(despachoId: string, andenId: string, terminalId: string) {
    const despacho = await this.despachoRepo.findOne({
      where: { id: despachoId, terminal_id: terminalId },
      relations: DESPACHO_RELATIONS,
    });
    const anden = await this.andenRepo.findOne({
      where: { id: andenId, terminal_id: terminalId },
    });
    if (!despacho) throw new RecursoNoEncontradoError('Despacho', despachoId);
    if (!anden) throw new RecursoNoEncontradoError('Andén', andenId);
    if (anden.estado !== EstadoAnden.LIBRE) {
      throw new AndenNoDisponibleError(andenId, anden.estado);
    }
    if (![EstadoDespacho.EN_COLA, EstadoDespacho.ASIGNADO].includes(despacho.estado)) {
      throw new BadRequestException('Despacho no asignable');
    }

    const esReasignacion = !!despacho.anden_id;

    if (esReasignacion) {
      const prev = await this.andenRepo.findOne({ where: { id: despacho.anden_id! } });
      if (prev) {
        prev.estado = EstadoAnden.LIBRE;
        await this.andenRepo.save(prev);
        this.eventEmitter.emit('anden.updated', { anden: prev, despacho: null });
      }
    }

    const estadoAnterior = despacho.estado;
    despacho.prioridad = -1;
    const resultado = await this.asignarInterno(despacho, anden);

    if (esReasignacion) {
      // Emitir transición de reasignación (auto-transición ASIGNADO → ASIGNADO)
      this.stateMachine.transition(estadoAnterior, 'reasignar', {
        despachoId: despacho.id,
        organizationId: despacho.organization_id,
      });

      this.eventEmitter.emit(DESPACHO_EVENTS.REASIGNADO, {
        despachoId: despacho.id,
        terminalId,
        estado: EstadoDespacho.ASIGNADO,
        timestamp: new Date(),
        data: resultado,
      });
    }

    return resultado;
  }

  async confirmarLlegada(despachoId: string, conductorId: string) {
    const despacho = await this.despachoRepo.findOne({
      where: { id: despachoId, conductor_id: conductorId },
      relations: DESPACHO_RELATIONS,
    });
    if (!despacho) throw new RecursoNoEncontradoError('Despacho', despachoId);

    // Validar y emitir ESTADO_CAMBIADO via state machine
    this.stateMachine.transition(despacho.estado, 'confirmar', {
      despachoId: despacho.id,
      organizationId: despacho.organization_id,
    });

    despacho.estado = EstadoDespacho.EN_ANDEN;
    const saved = await this.despachoRepo.save(despacho);
    const mapped = this.mapDespacho(saved);

    if (despacho.anden) {
      this.eventEmitter.emit('anden.updated', { anden: despacho.anden, despacho: mapped });
    }

    this.eventEmitter.emit(DESPACHO_EVENTS.EN_ANDEN, {
      despachoId: saved.id,
      terminalId: saved.terminal_id,
      estado: EstadoDespacho.EN_ANDEN,
      timestamp: new Date(),
      data: mapped,
    });

    this.eventEmitter.emit('conductor.confirmado', mapped);

    return mapped;
  }

  async despachar(despachoId: string, terminalId: string) {
    const despacho = await this.despachoRepo.findOne({
      where: { id: despachoId, terminal_id: terminalId },
      relations: DESPACHO_RELATIONS,
    });
    if (!despacho) throw new RecursoNoEncontradoError('Despacho', despachoId);

    // Validar y emitir ESTADO_CAMBIADO via state machine
    this.stateMachine.transition(despacho.estado, 'despachar', {
      despachoId: despacho.id,
      organizationId: despacho.organization_id,
    });

    despacho.estado = EstadoDespacho.DESPACHADO;
    despacho.hora_salida = new Date();
    await this.despachoRepo.save(despacho);

    if (despacho.unidad) {
      const estadoUnidadAnterior = despacho.unidad.estado;
      despacho.unidad.estado = EstadoUnidad.EN_RUTA;
      await this.unidadRepo.save(despacho.unidad);

      this.eventEmitter.emit(UNIDAD_EVENTS.ESTADO_CAMBIADO, {
        unidadId: despacho.unidad.id,
        estadoAnterior: estadoUnidadAnterior,
        estadoNuevo: EstadoUnidad.EN_RUTA,
      });
    }

    if (despacho.anden_id) {
      const anden = await this.andenRepo.findOne({ where: { id: despacho.anden_id } });
      if (anden) {
        anden.estado = EstadoAnden.LIBRE;
        await this.andenRepo.save(anden);
        this.eventEmitter.emit('anden.updated', { anden, despacho: null });
      }
    }

    const mapped = this.mapDespacho(despacho);

    this.eventEmitter.emit(DESPACHO_EVENTS.DESPACHADO, {
      despachoId: despacho.id,
      terminalId,
      estado: EstadoDespacho.DESPACHADO,
      timestamp: new Date(),
      data: mapped,
    });

    await this.asignarAndenesLibres(terminalId);
    return mapped;
  }

  async cancelar(despachoId: string, terminalId: string) {
    const despacho = await this.despachoRepo.findOne({
      where: { id: despachoId, terminal_id: terminalId },
      relations: { anden: true },
    });
    if (!despacho) throw new RecursoNoEncontradoError('Despacho', despachoId);

    const estadoAnterior = despacho.estado;

    // Validar y emitir ESTADO_CAMBIADO via state machine
    this.stateMachine.transition(estadoAnterior, 'cancelar', {
      despachoId: despacho.id,
      organizationId: despacho.organization_id,
    });

    despacho.estado = EstadoDespacho.CANCELADO;
    despacho.anden_id = null;
    await this.despachoRepo.save(despacho);

    if (despacho.anden) {
      despacho.anden.estado = EstadoAnden.LIBRE;
      await this.andenRepo.save(despacho.anden);
      this.eventEmitter.emit('anden.updated', { anden: despacho.anden, despacho: null });
    }

    this.eventEmitter.emit(DESPACHO_EVENTS.CANCELADO, {
      despachoId: despacho.id,
      terminalId,
      estado: EstadoDespacho.CANCELADO,
      timestamp: new Date(),
      data: this.mapDespacho(despacho),
    });

    await this.asignarAndenesLibres(terminalId);
    return this.mapDespacho(despacho);
  }

  async getHistorial(despachoId: string) {
    return this.auditLogService.getHistorial(despachoId);
  }
}
