import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  EstadoAbordaje,
  EstadoPago,
  MetodoPago,
  OrigenAbordaje,
} from '../../common/enums';
import { Despacho } from './despacho.entity';
import { Pasajero } from './pasajero.entity';

@Entity('abordaje')
export class Abordaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  /** Null cuando el abordaje es anónimo (registrado manualmente sin identidad) */
  @Column({ type: 'varchar', nullable: true })
  pasajero_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  despacho_id: string | null;

  @Column({ type: 'varchar', default: EstadoAbordaje.ABORDADO })
  estado: EstadoAbordaje;

  @Column({ type: 'varchar', default: OrigenAbordaje.QR })
  origen: OrigenAbordaje;

  // ─── Cobro ───────────────────────────────────────────────────
  /** Monto TOTAL cobrado al pasajero (pasaje + tasa_terminal) */
  @Column({ type: 'float', default: 0 })
  monto: number;

  /** Porción de `monto` correspondiente al derecho de salida del terminal */
  @Column({ type: 'float', default: 0 })
  tasa: number;

  @Column({ type: 'varchar', default: 'VES' })
  moneda: string;

  @Column({ type: 'varchar', nullable: true })
  metodo_pago: MetodoPago | null;

  /** Número de referencia del Pago Móvil / transferencia / punto de venta */
  @Column({ type: 'varchar', nullable: true })
  referencia: string | null;

  @Column({ type: 'varchar', default: EstadoPago.PENDIENTE })
  estado_pago: EstadoPago;

  @Column({ type: 'datetime', nullable: true })
  pagado_en: Date | null;

  /** Quién cobró: id de conductor o de usuario staff */
  @Column({ type: 'varchar', nullable: true })
  cobrado_por: string | null;

  @Column({ type: 'datetime', nullable: true })
  escaneado_en: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Pasajero, { nullable: true })
  @JoinColumn({ name: 'pasajero_id' })
  pasajero: Pasajero | null;

  @ManyToOne(() => Despacho, { nullable: true })
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho | null;
}
