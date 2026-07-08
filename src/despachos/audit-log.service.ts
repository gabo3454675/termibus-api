import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { DespachoAuditLog } from '../entities/despacho-audit-log.entity';
import { DESPACHO_EVENTS } from '../events/despacho.events';
import type { DespachoEstadoCambiadoPayload } from '../events/despacho.events';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(DespachoAuditLog)
    private readonly auditRepo: Repository<DespachoAuditLog>,
  ) {}

  @OnEvent(DESPACHO_EVENTS.ESTADO_CAMBIADO)
  async handleEstadoCambiado(payload: DespachoEstadoCambiadoPayload): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        despacho_id: payload.despachoId,
        estado_anterior: payload.estadoAnterior,
        estado_nuevo: payload.estadoNuevo,
        usuario_id: payload.usuarioId ?? null,
        razon: payload.razon ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (error) {
      // No propagar la excepción — la auditoría no debe romper
      // el flujo principal del despacho.
      this.logger.error(
        `Error al persistir auditoría para despacho ${payload.despachoId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Obtiene el historial de un despacho ordenado cronológicamente.
   */
  async getHistorial(despachoId: string): Promise<DespachoAuditLog[]> {
    return this.auditRepo.find({
      where: { despacho_id: despachoId },
      order: { creado_en: 'ASC' },
    });
  }
}
