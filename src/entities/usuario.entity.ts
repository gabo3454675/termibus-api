import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from '../common/enums';
import { Terminal } from './terminal.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Column({ type: 'varchar' })
  rol: Rol;

  @Column()
  nombre_completo: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'varchar', nullable: true })
  terminal_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  conductor_id: string | null;

  @Column({ default: 1 })
  token_version: number;

  @ManyToOne(() => Terminal, (t) => t.usuarios, { nullable: true })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal | null;
}
