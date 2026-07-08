import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoUnidad, TipoUnidad } from '../common/enums';
import { LineaTransporte } from './linea-transporte.entity';

@Entity('unidad')
export class Unidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  placa: string;

  @Column()
  numero_interno: string;

  @Column({ type: 'int' })
  capacidad: number;

  @Column({ type: 'varchar', default: TipoUnidad.BUS })
  tipo: TipoUnidad;

  @Column({ type: 'varchar', default: EstadoUnidad.DISPONIBLE })
  estado: EstadoUnidad;

  @Column()
  linea_id: string;

  @ManyToOne(() => LineaTransporte, (l) => l.unidades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linea_id' })
  linea: LineaTransporte;
}
