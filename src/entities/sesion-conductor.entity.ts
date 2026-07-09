import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conductor } from './conductor.entity';
import { Despacho } from './despacho.entity';

/** Sesión de turno sin contraseña — el conductor entra con su cédula */
@Entity('sesion_conductor')
export class SesionConductor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  despacho_id: string;

  @Column()
  conductor_id: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'datetime' })
  expira_en: Date;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Despacho)
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho;

  @ManyToOne(() => Conductor)
  @JoinColumn({ name: 'conductor_id' })
  conductor: Conductor;
}
