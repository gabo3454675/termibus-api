import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../tenant/organization.entity';

@Entity('destino')
export class Destino {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  ruta: string | null;

  @Column({ type: 'int', default: 60 })
  duracion_estimada_min: number;

  /** Tarifa del pasaje por defecto para este destino */
  @Column({ type: 'float', default: 0 })
  tarifa: number;

  @Column({ type: 'varchar', default: 'VES' })
  moneda: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => Organization, (o) => o.destinos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
