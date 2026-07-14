import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { SubscriptionStatus } from '../../common/enums';
import { Plan } from '../../entities/billing/plan.entity';
import { PlanLimit } from '../../entities/billing/plan-limit.entity';
import { Subscription } from '../../entities/billing/subscription.entity';
import { Invoice } from '../../entities/billing/invoice.entity';
import { UsageRecord } from '../../entities/billing/usage-record.entity';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { TrackMetric } from '../../common/metrics/track-metric.decorator';
import { CreatePlanDto } from '../dto/create-plan.dto';

@Injectable()
export class AdminBillingService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanLimit)
    private readonly planLimitRepo: Repository<PlanLimit>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(UsageRecord)
    private readonly usageRepo: Repository<UsageRecord>,
    private readonly auditLog: PlatformAuditLogService,
    private readonly metricsService: MetricsService,
  ) {}

  // ============================================================
  // PLANES
  // ============================================================

  @TrackMetric('admin.plans.list')
  async findAllPlans() {
    const plans = await this.planRepo.find({
      relations: { limites: true },
      order: { orden: 'ASC' },
    });
    return { success: true, data: plans };
  }

  @TrackMetric('admin.plans.create')
  async createPlan(data: CreatePlanDto) {
    const existing = await this.planRepo.findOne({ where: { codigo: data.codigo } });
    if (existing) throw new ConflictException('Ya existe un plan con ese código');

    const plan = this.planRepo.create(data);
    const saved = await this.planRepo.save(plan);

    await this.auditLog.log({
      action: 'plan.created',
      resource_type: 'plan',
      resource_id: saved.id,
      metadata: { codigo: data.codigo, nombre: data.nombre },
    });

    return { success: true, data: saved };
  }

  @TrackMetric('admin.plans.update')
  async updatePlan(id: string, data: Partial<CreatePlanDto>) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    await this.planRepo.update(id, data as never);
    const updated = await this.planRepo.findOne({
      where: { id },
      relations: { limites: true },
    });

    await this.auditLog.log({
      action: 'plan.updated',
      resource_type: 'plan',
      resource_id: id,
      metadata: { changes: Object.keys(data) },
    });

    return { success: true, data: updated };
  }

  @TrackMetric('admin.plans.delete')
  async deletePlan(id: string) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    // Verificar que no tenga suscripciones activas
    const activeSubscriptions = await this.subscriptionRepo.count({
      where: { plan_id: id, estado: SubscriptionStatus.ACTIVE },
    });
    if (activeSubscriptions > 0) {
      throw new ConflictException(
        'No se puede eliminar un plan con suscripciones activas. Desactívalo en su lugar.',
      );
    }

    // Soft delete: desactivar en lugar de eliminar
    await this.planRepo.update(id, { activo: false });

    await this.auditLog.log({
      action: 'plan.deactivated',
      resource_type: 'plan',
      resource_id: id,
    });

    return { success: true, data: { id, activo: false } };
  }

  // ============================================================
  // SUSCRIPCIONES (ADMIN)
  // ============================================================

  @TrackMetric('admin.subscriptions.list')
  async findAllSubscriptions(take = 50, skip = 0) {
    const [data, total] = await this.subscriptionRepo.findAndCount({
      relations: { organization: true, plan: true },
      order: { current_period_start: 'DESC' },
      take,
      skip,
    });
    return { success: true, data, meta: { total, take, skip } };
  }

  @TrackMetric('admin.subscriptions.change_plan')
  async changePlan(subscriptionId: string, planId: string) {
    const sub = await this.subscriptionRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const plan = await this.planRepo.findOne({ where: { id: planId, activo: true } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    await this.subscriptionRepo.update(subscriptionId, {
      plan_id: planId,
      // Reset current period when changing plan
      current_period_start: new Date(),
      current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    } as never);

    const updated = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: { organization: true, plan: true },
    });

    await this.auditLog.log({
      action: 'subscription.plan_changed',
      resource_type: 'subscription',
      resource_id: subscriptionId,
      metadata: { new_plan_id: planId },
    });

    return { success: true, data: updated };
  }

  @TrackMetric('admin.subscriptions.change_status')
  async changeStatus(subscriptionId: string, estado: string) {
    const sub = await this.subscriptionRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');

    const validStatuses: string[] = Object.values(SubscriptionStatus);
    if (!validStatuses.includes(estado)) {
      throw new BadRequestException(`Estado inválido. Valores: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { estado };

    // Si se cancela, registrar fecha
    if (estado === 'CANCELLED') {
      updateData.cancelled_at = new Date();
    }

    await this.subscriptionRepo.update(subscriptionId, updateData as never);

    const updated = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: { organization: true, plan: true },
    });

    await this.auditLog.log({
      action: 'subscription.status_changed',
      resource_type: 'subscription',
      resource_id: subscriptionId,
      metadata: { new_status: estado },
    });

    return { success: true, data: updated };
  }

  // ============================================================
  // SUSCRIPCIÓN (ORGANIZACIÓN)
  // ============================================================

  async findSubscriptionByOrg(orgId: string) {
    const sub = await this.subscriptionRepo.findOne({
      where: { organization_id: orgId },
      relations: { plan: { limites: true } },
    });
    if (!sub) throw new NotFoundException('Esta organización no tiene suscripción');
    return { success: true, data: sub };
  }

  async changePlanByOrg(orgId: string, planId: string) {
    const sub = await this.subscriptionRepo.findOne({
      where: { organization_id: orgId },
    });
    if (!sub) throw new NotFoundException('Esta organización no tiene suscripción');

    const plan = await this.planRepo.findOne({ where: { id: planId, activo: true } });
    if (!plan) throw new NotFoundException('Plan no encontrado o no disponible');

    await this.subscriptionRepo.update(sub.id, {
      plan_id: planId,
      current_period_start: new Date(),
      current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    } as never);

    const updated = await this.subscriptionRepo.findOne({
      where: { id: sub.id },
      relations: { plan: { limites: true } },
    });

    await this.auditLog.log({
      action: 'subscription.plan_changed_by_org',
      resource_type: 'subscription',
      resource_id: sub.id,
      metadata: { new_plan_id: planId },
    });

    return { success: true, data: updated };
  }

  // ============================================================
  // PLAN LIMITS
  // ============================================================

  async upsertPlanLimit(planId: string, recurso: string, limite: number) {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const existing = await this.planLimitRepo.findOne({
      where: { plan_id: planId, recurso: recurso as any },
    });

    if (existing) {
      existing.limite = limite;
      await this.planLimitRepo.save(existing);
    } else {
      await this.planLimitRepo.save(
        this.planLimitRepo.create({
          plan_id: planId,
          recurso: recurso as any,
          limite,
        }),
      );
    }

    // Devolver plan actualizado con límites
    const updated = await this.planRepo.findOne({
      where: { id: planId },
      relations: { limites: true },
    });

    await this.auditLog.log({
      action: 'plan_limit.upserted',
      resource_type: 'plan-limit',
      resource_id: planId,
      metadata: { recurso, limite },
    });

    return { success: true, data: updated };
  }

  // ============================================================
  // FACTURAS (ADMIN)
  // ============================================================

  @TrackMetric('admin.invoices.list')
  async findAllInvoices(filters?: {
    organization_id?: string;
    estado?: string;
    date_from?: string;
    date_to?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};
    if (filters?.organization_id) where.organization_id = filters.organization_id;
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.date_from && filters?.date_to) {
      where.periodo_inicio = Between(new Date(filters.date_from), new Date(filters.date_to));
    } else if (filters?.date_from) {
      where.periodo_inicio = MoreThanOrEqual(new Date(filters.date_from));
    } else if (filters?.date_to) {
      where.periodo_inicio = LessThanOrEqual(new Date(filters.date_to));
    }
    const take = filters?.take ?? 50;
    const skip = filters?.skip ?? 0;
    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
      relations: { organization: true },
      order: { periodo_inicio: 'DESC' },
      take,
      skip,
    });
    return { success: true, data, meta: { total, take, skip } };
  }

  @TrackMetric('admin.invoices.create')
  async createInvoice(data: {
    organization_id: string;
    subscription_id: string;
    numero: string;
    monto_usd: number;
    periodo_inicio: string;
    periodo_fin: string;
    estado?: string;
  }) {
    const invoice = this.invoiceRepo.create({
      organization_id: data.organization_id,
      subscription_id: data.subscription_id,
      numero: data.numero,
      monto_usd: data.monto_usd,
      periodo_inicio: new Date(data.periodo_inicio),
      periodo_fin: new Date(data.periodo_fin),
      estado: (data.estado as any) ?? 'DRAFT',
    });
    const saved = await this.invoiceRepo.save(invoice);
    const created = await this.invoiceRepo.findOne({
      where: { id: saved.id },
      relations: { organization: true },
    });

    await this.auditLog.log({
      action: 'invoice.created',
      resource_type: 'invoice',
      resource_id: saved.id,
      metadata: { organization_id: data.organization_id, monto_usd: data.monto_usd },
    });

    return { success: true, data: created };
  }

  // ============================================================
  // FACTURAS (ORGANIZACIÓN)
  // ============================================================

  async findInvoicesByOrg(orgId: string) {
    const invoices = await this.invoiceRepo.find({
      where: { organization_id: orgId },
      order: { periodo_inicio: 'DESC' },
    });
    return { success: true, data: invoices };
  }

  // ============================================================
  // USAGE
  // ============================================================

  async findUsageByOrg(orgId: string) {
    const records = await this.usageRepo.find({
      where: { organization_id: orgId },
      order: { periodo: 'DESC' },
    });

    // También obtener límites del plan
    const sub = await this.subscriptionRepo.findOne({
      where: { organization_id: orgId },
      relations: { plan: { limites: true } },
    });

    // Combinar usage con límites
    const usageWithLimits = (sub?.plan?.limites ?? []).map((limit) => {
      const used = records
        .filter((r) => r.recurso === limit.recurso)
        .reduce((sum, r) => sum + r.cantidad, 0);
      return {
        recurso: limit.recurso,
        limite: limit.limite,
        usado: used,
        periodo: records[0]?.periodo ?? null,
      };
    });

    return { success: true, data: usageWithLimits };
  }
}
