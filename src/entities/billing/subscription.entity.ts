import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BillingPeriod, SubscriptionStatus } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';
import { Invoice } from './invoice.entity';
import { Plan } from './plan.entity';

@Entity('subscription')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  organization_id: string;

  @Column()
  plan_id: string;

  @Column({ type: 'varchar', default: SubscriptionStatus.TRIAL })
  estado: SubscriptionStatus;

  @Column({ type: 'varchar', default: BillingPeriod.MONTHLY })
  periodo: BillingPeriod;

  @Column({ type: 'datetime', nullable: true })
  trial_ends_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  current_period_start: Date | null;

  @Column({ type: 'datetime', nullable: true })
  current_period_end: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  stripe_customer_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripe_subscription_id: string | null;

  @OneToOne(() => Organization, (o) => o.subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Plan, (p) => p.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToMany(() => Invoice, (i) => i.subscription)
  facturas: Invoice[];
}
