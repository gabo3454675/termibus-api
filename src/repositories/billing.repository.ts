import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PlanCode, SubscriptionStatus } from '../common/enums';
import { Plan } from '../entities/billing/plan.entity';
import { PlanLimit } from '../entities/billing/plan-limit.entity';
import { Subscription } from '../entities/billing/subscription.entity';

@Injectable()
export class BillingRepository {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanLimit)
    private readonly planLimitRepo: Repository<PlanLimit>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
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
}
