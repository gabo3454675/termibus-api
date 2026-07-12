import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../tenant/organization.entity';
import { LineaTransporte } from './linea-transporte.entity';

@Entity('conductor')
@Unique(['organization_id', 'cedula'])
export class Conductor {
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

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', nullable: true })
  licencia: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column()
  linea_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => LineaTransporte, (l) => l.conductores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linea_id' })
  linea: LineaTransporte;
}
