import { Injectable, Inject, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAuditLog } from '../../entities/platform/platform-audit-log.entity';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

interface AuditLogEntry {
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ scope: Scope.REQUEST })
export class PlatformAuditLogService {
  constructor(
    @InjectRepository(PlatformAuditLog)
    private readonly auditLogRepo: Repository<PlatformAuditLog>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const actorUserId = (this.request as any)?.user?.sub ?? null;
    const ip = this.request?.ip ?? null;

    const log = this.auditLogRepo.create({
      actor_user_id: actorUserId,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      metadata: entry.metadata ?? null,
      ip,
    });

    await this.auditLogRepo.save(log);
  }
}
