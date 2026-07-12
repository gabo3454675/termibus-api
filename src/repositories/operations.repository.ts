import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoAnden } from '../common/enums';
import { Anden } from '../entities/operations/anden.entity';
import { Conductor } from '../entities/operations/conductor.entity';
import { DespachoAuditLog } from '../entities/operations/despacho-audit-log.entity';
import { Despacho } from '../entities/operations/despacho.entity';
import { Destino } from '../entities/operations/destino.entity';
import { LineaTransporte } from '../entities/operations/linea-transporte.entity';
import { Unidad } from '../entities/operations/unidad.entity';

@Injectable()
export class OperationsRepository {
  constructor(
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
    @InjectRepository(Anden)
    private readonly andenRepo: Repository<Anden>,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
    @InjectRepository(Conductor)
    private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Destino)
    private readonly destinoRepo: Repository<Destino>,
    @InjectRepository(DespachoAuditLog)
    private readonly auditLogRepo: Repository<DespachoAuditLog>,
    @InjectRepository(LineaTransporte)
    private readonly lineaRepo: Repository<LineaTransporte>,
  ) {}

  async findDespachosByTerminal(
    terminalId: string,
    organizationId: string,
    estado?: string,
  ): Promise<Despacho[]> {
    const where: Record<string, unknown> = {
      terminal_id: terminalId,
      organization_id: organizationId,
    };
    if (estado) {
      where.estado = estado;
    }
    return this.despachoRepo.find({
      where,
      relations: {
        unidad: true,
        conductor: true,
        anden: true,
        destino: true,
        terminal: true,
      },
    });
  }

  async findAndenesByTerminal(
    terminalId: string,
    organizationId: string,
  ): Promise<Anden[]> {
    return this.andenRepo.find({
      where: { terminal_id: terminalId, organization_id: organizationId },
    });
  }

  async findAndenesLibres(
    terminalId: string,
    organizationId: string,
  ): Promise<Anden[]> {
    return this.andenRepo.find({
      where: {
        terminal_id: terminalId,
        organization_id: organizationId,
        estado: EstadoAnden.LIBRE,
      },
    });
  }

  async findDespachoById(id: string): Promise<Despacho | null> {
    return this.despachoRepo.findOne({
      where: { id },
      relations: {
        unidad: true,
        conductor: true,
        anden: true,
        destino: true,
        terminal: true,
        organization: true,
        creador: true,
      },
    });
  }

  async findUnidadById(id: string): Promise<Unidad | null> {
    return this.unidadRepo.findOne({ where: { id } });
  }

  async findConductorById(id: string): Promise<Conductor | null> {
    return this.conductorRepo.findOne({ where: { id } });
  }

  async findDestinoById(id: string): Promise<Destino | null> {
    return this.destinoRepo.findOne({ where: { id } });
  }

  async findAndenById(id: string): Promise<Anden | null> {
    return this.andenRepo.findOne({ where: { id } });
  }

  async findLineasByTerminal(
    terminalId: string,
    organizationId: string,
  ): Promise<LineaTransporte[]> {
    return this.lineaRepo.find({
      where: { terminal_id: terminalId, organization_id: organizationId },
    });
  }

  async findAuditLogs(despachoId: string): Promise<DespachoAuditLog[]> {
    return this.auditLogRepo.find({
      where: { despacho_id: despachoId },
      order: { creado_en: 'ASC' },
    });
  }

  get rawDespacho(): Repository<Despacho> {
    return this.despachoRepo;
  }

  get rawAnden(): Repository<Anden> {
    return this.andenRepo;
  }

  get rawUnidad(): Repository<Unidad> {
    return this.unidadRepo;
  }

  get rawConductor(): Repository<Conductor> {
    return this.conductorRepo;
  }

  get rawDestino(): Repository<Destino> {
    return this.destinoRepo;
  }

  get rawAuditLog(): Repository<DespachoAuditLog> {
    return this.auditLogRepo;
  }

  get rawLinea(): Repository<LineaTransporte> {
    return this.lineaRepo;
  }
}
