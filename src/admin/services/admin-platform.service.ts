import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from '../../entities/platform/feature-flag.entity';
import { OrganizationFeature } from '../../entities/platform/organization-feature.entity';
import { PlatformAuditLog } from '../../entities/platform/platform-audit-log.entity';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { TrackMetric } from '../../common/metrics/track-metric.decorator';

@Injectable()
export class AdminPlatformService {
  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
    @InjectRepository(OrganizationFeature)
    private readonly orgFeatureRepo: Repository<OrganizationFeature>,
    @InjectRepository(PlatformAuditLog)
    private readonly auditLogRepo: Repository<PlatformAuditLog>,
    private readonly auditLog: PlatformAuditLogService,
    private readonly metricsService: MetricsService,
  ) {}

  // ============================================================
  // FEATURE FLAGS (globales)
  // ============================================================

  @TrackMetric('admin.feature_flags.list')
  async findAllFlags() {
    const flags = await this.flagRepo.find({
      order: { key: 'ASC' },
    });
    return { success: true, data: flags };
  }

  @TrackMetric('admin.feature_flags.create')
  async createFlag(data: { key: string; description?: string; default_enabled?: boolean }) {
    const existing = await this.flagRepo.findOne({ where: { key: data.key } });
    if (existing) throw new ConflictException('Ya existe un feature flag con esa key');

    const flag = this.flagRepo.create({
      key: data.key,
      description: data.description,
      default_enabled: data.default_enabled ?? false,
    });
    const saved = await this.flagRepo.save(flag);

    await this.auditLog.log({
      action: 'feature_flag.created',
      resource_type: 'feature_flag',
      resource_id: saved.id,
      metadata: { key: data.key },
    });

    return { success: true, data: saved };
  }

  @TrackMetric('admin.feature_flags.update')
  async updateFlag(id: string, data: { description?: string; default_enabled?: boolean }) {
    const flag = await this.flagRepo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag no encontrado');

    await this.flagRepo.update(id, data as never);
    const updated = await this.flagRepo.findOne({ where: { id } });

    await this.auditLog.log({
      action: 'feature_flag.updated',
      resource_type: 'feature_flag',
      resource_id: id,
    });

    return { success: true, data: updated };
  }

  // ============================================================
  // ORGANIZATION FEATURES (overrides por organización)
  // ============================================================

  @TrackMetric('admin.org_features.list')
  async findOrgFeatures(orgId: string) {
    // Obtener todos los flags con su estado para esta organización
    const flags = await this.flagRepo.find({ order: { key: 'ASC' } });
    const orgFeatures = await this.orgFeatureRepo.find({
      where: { organization_id: orgId },
    });

    const result = flags.map((flag) => {
      const orgFeature = orgFeatures.find((of) => of.feature_flag_id === flag.id);
      return {
        flag_id: flag.id,
        key: flag.key,
        description: flag.description,
        default_enabled: flag.default_enabled,
        enabled: orgFeature?.enabled ?? flag.default_enabled,
        config: orgFeature?.config ?? null,
      };
    });

    return { success: true, data: result };
  }

  @TrackMetric('admin.org_features.toggle')
  async toggleOrgFeature(orgId: string, flagId: string, enabled: boolean) {
    const flag = await this.flagRepo.findOne({ where: { id: flagId } });
    if (!flag) throw new NotFoundException('Feature flag no encontrado');

    // Buscar si ya existe asignación
    let orgFeature = await this.orgFeatureRepo.findOne({
      where: { organization_id: orgId, feature_flag_id: flagId },
    });

    if (orgFeature) {
      orgFeature.enabled = enabled;
      await this.orgFeatureRepo.save(orgFeature);
    } else {
      orgFeature = await this.orgFeatureRepo.save(
        this.orgFeatureRepo.create({
          organization_id: orgId,
          feature_flag_id: flagId,
          enabled,
        }),
      );
    }

    await this.auditLog.log({
      action: 'organization_feature.toggled',
      resource_type: 'organization_feature',
      resource_id: flagId,
      metadata: { organization_id: orgId, enabled },
    });

    return { success: true, data: { flag_id: flagId, enabled } };
  }

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  @TrackMetric('admin.audit.list')
  async findAuditLogs(filters?: {
    action?: string;
    resource_type?: string;
    actor_user_id?: string;
    date_from?: string;
    date_to?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.resource_type) where.resource_type = filters.resource_type;
    if (filters?.actor_user_id) where.actor_user_id = filters.actor_user_id;
    if (filters?.date_from || filters?.date_to) {
      where.creado_en = {};
      if (filters.date_from) where.creado_en.gte = new Date(filters.date_from);
      if (filters.date_to) where.creado_en.lte = new Date(filters.date_to);
    }

    const take = filters?.take ?? 50;
    const skip = filters?.skip ?? 0;

    const [data, total] = await this.auditLogRepo.findAndCount({
      where,
      order: { creado_en: 'DESC' },
      relations: { actor: true },
      take,
      skip,
    });

    return {
      success: true,
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        actor_email: log.actor?.email ?? null,
        actor_user_id: log.actor_user_id,
        ip: log.ip,
        metadata: log.metadata,
        creado_en: log.creado_en,
      })),
      meta: { total, take, skip },
    };
  }
}
