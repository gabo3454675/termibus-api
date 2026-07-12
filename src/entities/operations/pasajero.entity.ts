import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../tenant/organization.entity';

@Entity('pasajero')
@Unique(['organization_id', 'cedula'])
export class Pasajero {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  cedula: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column({ type: 'text', nullable: true })
  foto_url: string | null;

  @Column({ unique: true })
  qr_token: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_en: Date;

  @ManyToOne(() => Organization, (o) => o.pasajeros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
