import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SyncChangeLog } from '../entities/sync-changelog.entity';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncChangeLog)
    private readonly changelogRepo: Repository<SyncChangeLog>,
  ) {}

  async registerChange(params: {
    organizationId: string;
    entity: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    data?: Record<string, unknown>;
    userId?: string;
    terminalId?: string;
  }): Promise<SyncChangeLog> {
    const entry = this.changelogRepo.create({
      organization_id: params.organizationId,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      data: params.data ?? null,
      userId: params.userId ?? null,
      terminal_id: params.terminalId ?? null,
    });
    return this.changelogRepo.save(entry);
  }

  async getChangesSince(
    since: string,
    organizationId: string,
    options?: { entity?: string; terminalId?: string; limit?: number },
  ): Promise<{ changes: SyncChangeLog[]; serverTimestamp: string }> {
    const sinceDate = new Date(since);

    const query = this.changelogRepo
      .createQueryBuilder('cl')
      .where('cl.timestamp >= :since', { since: sinceDate })
      .andWhere('cl.organization_id = :organizationId', { organizationId })
      .orderBy('cl.timestamp', 'ASC');

    if (options?.entity) {
      query.andWhere('cl.entity = :entity', { entity: options.entity });
    }

    if (options?.terminalId) {
      query.andWhere('cl.terminal_id = :terminalId', {
        terminalId: options.terminalId,
      });
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    const changes = await query.getMany();
    return {
      changes,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async cleanOlderThan(date: Date): Promise<number> {
    const result = await this.changelogRepo.delete({
      timestamp: LessThan(date),
    });
    return result.affected ?? 0;
  }

  @Cron(CronExpression.EVERY_WEEK)
  async autoClean() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      const deleted = await this.cleanOlderThan(sevenDaysAgo);
      if (deleted > 0) {
        this.logger.log(`Sync changelog: ${deleted} registros antiguos eliminados`);
      }
    } catch (error) {
      this.logger.error(`Error en limpieza automática de sync changelog: ${(error as Error).message}`);
    }
  }
}
