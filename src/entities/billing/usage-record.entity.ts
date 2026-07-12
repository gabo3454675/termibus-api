import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlanResource } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';

@Entity('usage_record')
@Unique(['organization_id', 'recurso', 'periodo'])
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column({ type: 'varchar' })
  recurso: PlanResource;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  /** Formato YYYY-MM */
  @Column()
  periodo: string;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Organization, (o) => o.uso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
