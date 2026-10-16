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

/**
 * Cierre de caja de un turno/unidad. Guarda el desglose de recaudación por
 * método de pago y los montos pendientes al momento del cierre, para sustituir
 * el cuadre manual en papel.
 */
@Entity('cierre_turno')
export class CierreTurno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  despacho_id: string;

  @Column({ type: 'varchar', nullable: true })
  conductor_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  terminal_id: string | null;

  /** Cantidad de pasajeros abordados (ABORDADO) */
  @Column({ type: 'int', default: 0 })
  pasajeros: number;

  /** Recaudado en efectivo */
  @Column({ type: 'float', default: 0 })
  efectivo: number;

  /** Recaudado por Pago Móvil */
  @Column({ type: 'float', default: 0 })
  pago_movil: number;

  /** Recaudado por otros métodos (punto de venta, transferencia, etc.) */
  @Column({ type: 'float', default: 0 })
  otros: number;

  /** Total recaudado (suma de todos los métodos) */
  @Column({ type: 'float', default: 0 })
  recaudado: number;

  /** Monto que quedó pendiente de cobro al cerrar */
  @Column({ type: 'float', default: 0 })
  monto_pendiente: number;

  /** Total del derecho de salida (tasa de terminal) recaudado */
  @Column({ type: 'float', default: 0 })
  tasa_total: number;

  @Column({ type: 'varchar', default: 'VES' })
  moneda: string;

  @Column({ type: 'varchar', nullable: true })
  notas: string | null;

  @Column({ type: 'varchar', nullable: true })
  cerrado_por: string | null;

  @Column({ type: 'datetime' })
  cerrado_en: Date;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Despacho)
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho;

  @ManyToOne(() => Conductor, { nullable: true })
  @JoinColumn({ name: 'conductor_id' })
  conductor: Conductor | null;
}
