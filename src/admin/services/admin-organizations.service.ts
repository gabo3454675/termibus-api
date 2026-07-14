import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/tenant/organization.entity';
import { Terminal } from '../../entities/tenant/terminal.entity';
import { OrganizationMember } from '../../entities/auth/organization-member.entity';
import { Plan } from '../../entities/billing/plan.entity';
import { Subscription } from '../../entities/billing/subscription.entity';
import { PlanCode, SubscriptionStatus, BillingPeriod } from '../../common/enums';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { TrackMetric } from '../../common/metrics/track-metric.decorator';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

@Injectable()
export class AdminOrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly auditLog: PlatformAuditLogService,
    private readonly metricsService: MetricsService,
  ) {}

  @TrackMetric('admin.organizations.list')
  async findAll(take = 50, skip = 0) {
    const { raw, entities } = await this.orgRepo
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.subscription', 'sub')
      .leftJoinAndSelect('sub.plan', 'plan')
      .addSelect((qb) =>
        qb
          .select('COUNT(*)')
          .from(OrganizationMember, 'm')
          .where('m.organization_id = org.id')
          .andWhere('m.activo = :activo', { activo: true }),
        'miembros_count',
      )
      .addSelect((qb) =>
        qb
          .select('COUNT(*)')
          .from(Terminal, 't')
          .where('t.organization_id = org.id'),
        'terminales_count',
      )
      .orderBy('org.creado_en', 'DESC')
      .skip(skip)
      .take(take)
      .getRawAndEntities();

    const total = await this.orgRepo.count();

    const data = entities.map((org, i) => ({
      ...org,
      miembros_count: Number(raw[i].miembros_count),
      terminales_count: Number(raw[i].terminales_count),
    }));

    return { success: true, data, meta: { total, take, skip } };
  }

  @TrackMetric('admin.organizations.detail')
  async findById(id: string) {
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: { subscription: { plan: true }, terminales: true },
    });

    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    const miembros_count = await this.memberRepo.count({
      where: { organization_id: id, activo: true },
    });

    return { success: true, data: { ...org, miembros_count } };
  }

  @TrackMetric('admin.organizations.create')
  async create(data: CreateOrganizationDto) {
    const existing = await this.orgRepo.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException('El slug ya está en uso');
    }

    const org = this.orgRepo.create(data);
    const saved = await this.orgRepo.save(org);

    // Crear suscripción FREE por defecto
    const plan = await this.planRepo.findOne({ where: { codigo: PlanCode.FREE } });

    if (plan) {
      await this.subscriptionRepo.save({
        organization_id: saved.id,
        plan_id: plan.id,
        estado: SubscriptionStatus.ACTIVE,
        periodo: BillingPeriod.MONTHLY,
        current_period_start: new Date(),
        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      } as Partial<Subscription>);
    }

    await this.auditLog.log({
      action: 'organization.created',
      resource_type: 'organization',
      resource_id: saved.id,
      metadata: { nombre: data.nombre, slug: data.slug },
    });

    return { success: true, data: saved };
  }

  @TrackMetric('admin.organizations.update')
  async update(id: string, data: UpdateOrganizationDto) {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    if (data.slug && data.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException('El slug ya está en uso');
      }
    }

    await this.orgRepo.update(id, data as any);
    const updated = await this.orgRepo.findOne({ where: { id } });

    await this.auditLog.log({
      action: 'organization.updated',
      resource_type: 'organization',
      resource_id: id,
      metadata: { changes: Object.keys(data) },
    });

    return { success: true, data: updated };
  }

  @TrackMetric('admin.organizations.suspend')
  async suspend(id: string) {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    await this.orgRepo.update(id, { activo: false });

    await this.auditLog.log({
      action: 'organization.suspended',
      resource_type: 'organization',
      resource_id: id,
    });

    return { success: true, data: { id, activo: false } };
  }

  @TrackMetric('admin.organizations.activate')
  async activate(id: string) {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    await this.orgRepo.update(id, { activo: true });

    await this.auditLog.log({
      action: 'organization.activated',
      resource_type: 'organization',
      resource_id: id,
    });

    return { success: true, data: { id, activo: true } };
  }
}
