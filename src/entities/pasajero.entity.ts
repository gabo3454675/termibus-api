import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pasajero')
export class Pasajero {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Documento único — identifica al pasajero de forma permanente */
  @Column({ unique: true })
  cedula: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  /** Foto en base64 (data URL) para verificación al abordar */
  @Column({ type: 'text', nullable: true })
  foto_url: string | null;

  /** Token opaco que el teléfono guarda — equivale a "estar logueado" sin contraseña */
  @Column({ unique: true })
  qr_token: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'datetime' })
  actualizado_en: Date;
}
