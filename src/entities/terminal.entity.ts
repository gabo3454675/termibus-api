import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Anden } from './anden.entity';
import { LineaTransporte } from './linea-transporte.entity';
import { Usuario } from './usuario.entity';

@Entity('terminal')
export class Terminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column()
  direccion: string;

  @Column()
  ciudad: string;

  @CreateDateColumn()
  creado_en: Date;

  @OneToMany(() => Anden, (a) => a.terminal)
  andenes: Anden[];

  @OneToMany(() => LineaTransporte, (l) => l.terminal)
  lineas: LineaTransporte[];

  @OneToMany(() => Usuario, (u) => u.terminal)
  usuarios: Usuario[];
}
