import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlanCode } from '../../common/enums';
import { PlanLimit } from './plan-limit.entity';
import { Subscription } from './subscription.entity';

@Entity('plan')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  codigo: PlanCode;

  @Column()
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precio_mensual_usd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precio_anual_usd: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @OneToMany(() => PlanLimit, (l) => l.plan)
  limites: PlanLimit[];

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
