import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoAbordaje } from '../../common/enums';
import { Despacho } from './despacho.entity';
import { Pasajero } from './pasajero.entity';

@Entity('abordaje')
export class Abordaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  pasajero_id: string;

  @Column({ type: 'varchar', nullable: true })
  despacho_id: string | null;

  @Column({ type: 'varchar', default: EstadoAbordaje.RESERVADO })
  estado: EstadoAbordaje;

  @Column({ type: 'datetime', nullable: true })
  escaneado_en: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Pasajero)
  @JoinColumn({ name: 'pasajero_id' })
  pasajero: Pasajero;

  @ManyToOne(() => Despacho, { nullable: true })
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho | null;
}
