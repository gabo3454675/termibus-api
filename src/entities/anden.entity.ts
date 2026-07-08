import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoAnden } from '../common/enums';
import { Terminal } from './terminal.entity';

@Entity('anden')
export class Anden {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  numero: number;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', default: EstadoAnden.LIBRE })
  estado: EstadoAnden;

  @Column()
  terminal_id: string;

  @ManyToOne(() => Terminal, (t) => t.andenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;
}
