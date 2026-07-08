import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoDespacho } from '../common/enums';
import { Anden } from './anden.entity';
import { Conductor } from './conductor.entity';
import { Destino } from './destino.entity';
import { Terminal } from './terminal.entity';
import { Unidad } from './unidad.entity';
import { Usuario } from './usuario.entity';

@Entity('despacho')
export class Despacho {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  unidad_id: string;

  @Column()
  conductor_id: string;

  @Column({ type: 'varchar', nullable: true })
  anden_id: string | null;

  @Column()
  destino_id: string;

  @Column()
  terminal_id: string;

  @Column({ type: 'varchar', nullable: true })
  hora_programada: string | null;

  @Column({ type: 'datetime', nullable: true })
  hora_asignacion: Date | null;

  @Column({ type: 'datetime', nullable: true })
  hora_salida: Date | null;

  @Column({ type: 'datetime', nullable: true })
  hora_llegada: Date | null;

  @Column({ type: 'varchar', default: EstadoDespacho.EN_COLA })
  estado: EstadoDespacho;

  @Column({ type: 'int', default: 0 })
  prioridad: number;

  @Column({ type: 'varchar', nullable: true })
  creado_por: string | null;

  @CreateDateColumn()
  creado_en: Date;

  @ManyToOne(() => Unidad)
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @ManyToOne(() => Conductor)
  @JoinColumn({ name: 'conductor_id' })
  conductor: Conductor;

  @ManyToOne(() => Anden, { nullable: true })
  @JoinColumn({ name: 'anden_id' })
  anden: Anden | null;

  @ManyToOne(() => Destino)
  @JoinColumn({ name: 'destino_id' })
  destino: Destino;

  @ManyToOne(() => Terminal)
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creador: Usuario | null;
}
