import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceStatus } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';
import { Subscription } from './subscription.entity';

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  subscription_id: string;

  @Column()
  numero: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monto_usd: number;

  @Column({ type: 'varchar', default: InvoiceStatus.DRAFT })
  estado: InvoiceStatus;

  @Column({ type: 'datetime' })
  periodo_inicio: Date;

  @Column({ type: 'datetime' })
  periodo_fin: Date;

  @Column({ type: 'varchar', nullable: true })
  stripe_invoice_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  pdf_url: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Organization, (o) => o.facturas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Subscription, (s) => s.facturas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;
}
