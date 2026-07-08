import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LineaTransporte } from './linea-transporte.entity';

@Entity('conductor')
export class Conductor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  cedula: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  licencia: string;

  @Column({ default: true })
  activo: boolean;

  @Column()
  linea_id: string;

  @ManyToOne(() => LineaTransporte, (l) => l.conductores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linea_id' })
  linea: LineaTransporte;
}
