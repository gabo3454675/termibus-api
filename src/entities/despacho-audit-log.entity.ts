import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Despacho } from './despacho.entity';

@Entity('despacho_audit_log')
export class DespachoAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  despacho_id: string;

  @Column({ type: 'varchar' })
  estado_anterior: string | null;

  @Column({ type: 'varchar' })
  estado_nuevo: string;

  @Column({ type: 'varchar', nullable: true })
  evento: string | null;

  @Column({ type: 'varchar', nullable: true })
  usuario_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  razon: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Despacho, { nullable: true })
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho | null;
}
