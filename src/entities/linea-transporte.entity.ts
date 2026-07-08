import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conductor } from './conductor.entity';
import { Terminal } from './terminal.entity';
import { Unidad } from './unidad.entity';

@Entity('linea_transporte')
export class LineaTransporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  contacto: string;

  @Column({ default: true })
  activo: boolean;

  @Column()
  terminal_id: string;

  @ManyToOne(() => Terminal, (t) => t.lineas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @OneToMany(() => Unidad, (u) => u.linea)
  unidades: Unidad[];

  @OneToMany(() => Conductor, (c) => c.linea)
  conductores: Conductor[];
}
