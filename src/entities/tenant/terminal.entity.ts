import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TerminalAssignment } from '../auth/terminal-assignment.entity';
import { Anden } from '../operations/anden.entity';
import { Despacho } from '../operations/despacho.entity';
import { LineaTransporte } from '../operations/linea-transporte.entity';
import { Organization } from './organization.entity';

@Entity('terminal')
@Unique(['organization_id', 'slug'])
export class Terminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  nombre: string;

  @Column()
  slug: string;

  @Column()
  direccion: string;

  @Column()
  ciudad: string;

  @Column({ default: true })
  activo: boolean;

  // ─── Datos de Pago Móvil (para el cobro del pasaje) ──────────
  @Column({ type: 'varchar', nullable: true })
  pago_movil_banco: string | null;

  @Column({ type: 'varchar', nullable: true })
  pago_movil_telefono: string | null;

  @Column({ type: 'varchar', nullable: true })
  pago_movil_cedula_rif: string | null;

  @Column({ type: 'varchar', nullable: true })
  pago_movil_titular: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Organization, (o) => o.terminales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Anden, (a) => a.terminal)
  andenes: Anden[];

  @OneToMany(() => LineaTransporte, (l) => l.terminal)
  lineas: LineaTransporte[];

  @OneToMany(() => Despacho, (d) => d.terminal)
  despachos: Despacho[];

  @OneToMany(() => TerminalAssignment, (a) => a.terminal)
  asignaciones: TerminalAssignment[];
}
