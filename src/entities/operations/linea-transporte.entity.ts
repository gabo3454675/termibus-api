import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conductor } from './conductor.entity';
import { Organization } from '../tenant/organization.entity';
import { Terminal } from '../tenant/terminal.entity';
import { Unidad } from './unidad.entity';

@Entity('linea_transporte')
export class LineaTransporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', nullable: true })
  contacto: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column()
  terminal_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Terminal, (t) => t.lineas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @OneToMany(() => Unidad, (u) => u.linea)
  unidades: Unidad[];

  @OneToMany(() => Conductor, (c) => c.linea)
  conductores: Conductor[];
}
