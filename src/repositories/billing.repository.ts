import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PlanCode, PlanResource, SubscriptionStatus } from '../common/enums';
import { Plan } from '../entities/billing/plan.entity';
import { PlanLimit } from '../entities/billing/plan-limit.entity';
import { Subscription } from '../entities/billing/subscription.entity';
import { Invoice } from '../entities/billing/invoice.entity';
import { UsageRecord } from '../entities/billing/usage-record.entity';

@Injectable()
export class BillingRepository {
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
  ) {}

  async findPlanByCode(codigo: PlanCode): Promise<Plan | null> {
    return this.planRepo.findOne({ where: { codigo } });
  }

  async findPlanWithLimits(planId: string): Promise<Plan | null> {
    return this.planRepo.findOne({
      where: { id: planId },
      relations: { limites: true },
    });
  }

  async findActiveSubscription(orgId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: {
        organization_id: orgId,
        estado: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
      },
    });
  }

  get rawPlan(): Repository<Plan> {
    return this.planRepo;
  }

  get rawPlanLimit(): Repository<PlanLimit> {
    return this.planLimitRepo;
  }

  get rawSubscription(): Repository<Subscription> {
    return this.subscriptionRepo;
  }

  get rawInvoice(): Repository<Invoice> {
    return this.invoiceRepo;
  }

  get rawUsage(): Repository<UsageRecord> {
    return this.usageRepo;
  }

  async findAllPlans(): Promise<Plan[]> {
    return this.planRepo.find({
      relations: { limites: true },
      order: { orden: 'ASC' },
    });
  }

  async findAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      relations: { organization: true, plan: true },
      order: { current_period_start: 'DESC' },
    });
  }

  async findSubscriptionById(id: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: { id },
      relations: { organization: true, plan: true },
    });
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<void> {
    await this.subscriptionRepo.update(id, data as never);
  }

  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    const sub = this.subscriptionRepo.create(data);
    return this.subscriptionRepo.save(sub);
  }

  async findInvoicesByOrg(
    orgId: string,
    options?: { take?: number; skip?: number },
  ): Promise<[Invoice[], number]> {
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { organization_id: orgId },
      order: { periodo_inicio: 'DESC' },
      take: options?.take ?? 20,
      skip: options?.skip ?? 0,
    });
    return [data, total];
  }

  async findUsageByOrg(orgId: string): Promise<UsageRecord[]> {
    return this.usageRepo.find({
      where: { organization_id: orgId },
      order: { periodo: 'DESC' },
    });
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const inv = this.invoiceRepo.create(data);
    return this.invoiceRepo.save(inv);
  }

  async findAllInvoices(filters?: {
    organization_id?: string;
    estado?: string;
    date_from?: string;
    date_to?: string;
    take?: number;
    skip?: number;
  }): Promise<[Invoice[], number]> {
    const where: any = {};
    if (filters?.organization_id) where.organization_id = filters.organization_id;
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.date_from || filters?.date_to) {
      where.periodo_inicio = {};
      if (filters.date_from) where.periodo_inicio.gte = new Date(filters.date_from);
      if (filters.date_to) where.periodo_inicio.lte = new Date(filters.date_to);
    }
    const [data, total] = await this.invoiceRepo.findAndCount({
      where,
      order: { periodo_inicio: 'DESC' },
      relations: { organization: true },
      take: filters?.take ?? 20,
      skip: filters?.skip ?? 0,
    });
    return [data, total];
  }

  async upsertPlanLimit(
    planId: string,
    recurso: PlanResource,
    limite: number,
  ): Promise<PlanLimit> {
    const existing = await this.planLimitRepo.findOne({
      where: { plan_id: planId, recurso },
    });
    if (existing) {
      existing.limite = limite;
      return this.planLimitRepo.save(existing);
    }
    return this.planLimitRepo.save(
      this.planLimitRepo.create({ plan_id: planId, recurso, limite }),
    );
  }
}
