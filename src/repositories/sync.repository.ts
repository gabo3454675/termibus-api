import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SyncChangeLog } from '../entities/operations/sync-changelog.entity';

@Injectable()
export class SyncRepository {
  constructor(
    @InjectRepository(SyncChangeLog)
    private readonly changelogRepo: Repository<SyncChangeLog>,
  ) {}

  async findChangesSince(
    since: Date,
    organizationId: string,
    options?: { entity?: string; terminalId?: string; limit?: number },
  ): Promise<SyncChangeLog[]> {
    const query = this.changelogRepo
      .createQueryBuilder('cl')
      .where('cl.timestamp >= :since', { since })
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

    return query.getMany();
  }

  async registerChange(data: Partial<SyncChangeLog>): Promise<SyncChangeLog> {
    const entry = this.changelogRepo.create(data);
    return this.changelogRepo.save(entry);
  }

  async cleanOlderThan(date: Date): Promise<number> {
    const result = await this.changelogRepo.delete({
      timestamp: LessThan(date),
    });
    return result.affected ?? 0;
  }

  get raw(): Repository<SyncChangeLog> {
    return this.changelogRepo;
  }
}
