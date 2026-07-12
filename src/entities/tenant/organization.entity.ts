import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationMember } from '../auth/organization-member.entity';
import { Invitation } from '../auth/invitation.entity';
import { Subscription } from '../billing/subscription.entity';
import { Invoice } from '../billing/invoice.entity';
import { UsageRecord } from '../billing/usage-record.entity';
import { Destino } from '../operations/destino.entity';
import { Pasajero } from '../operations/pasajero.entity';
import { OrganizationFeature } from '../platform/organization-feature.entity';
import { Terminal } from './terminal.entity';

@Entity('organization')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  email_contacto: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', nullable: true })
  pais: string | null;

  @Column({ default: 'America/Caracas' })
  timezone: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_en: Date;

  @OneToMany(() => Terminal, (t) => t.organization)
  terminales: Terminal[];

  @OneToMany(() => OrganizationMember, (m) => m.organization)
  miembros: OrganizationMember[];

  @OneToMany(() => Invitation, (i) => i.organization)
  invitaciones: Invitation[];

  @OneToOne(() => Subscription, (s) => s.organization)
  subscription: Subscription;

  @OneToMany(() => Invoice, (i) => i.organization)
  facturas: Invoice[];

  @OneToMany(() => UsageRecord, (u) => u.organization)
  uso: UsageRecord[];

  @OneToMany(() => Destino, (d) => d.organization)
  destinos: Destino[];

  @OneToMany(() => Pasajero, (p) => p.organization)
  pasajeros: Pasajero[];

  @OneToMany(() => OrganizationFeature, (f) => f.organization)
  features: OrganizationFeature[];
}
