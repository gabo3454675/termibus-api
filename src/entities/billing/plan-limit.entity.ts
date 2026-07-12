import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlanResource } from '../../common/enums';
import { Plan } from './plan.entity';

@Entity('plan_limit')
@Unique(['plan_id', 'recurso'])
export class PlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  plan_id: string;

  @Column({ type: 'varchar' })
  recurso: PlanResource;

  /** -1 = ilimitado */
  @Column({ type: 'int' })
  limite: number;

  @ManyToOne(() => Plan, (p) => p.limites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
