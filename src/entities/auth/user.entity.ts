import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationMember } from './organization-member.entity';
import { PlatformAuditLog } from '../platform/platform-audit-log.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  nombre_completo: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  is_platform_admin: boolean;

  @Column({ type: 'varchar', nullable: true })
  conductor_id: string | null;

  @Column({ default: 1 })
  token_version: number;

  @Column({ type: 'datetime', nullable: true })
  ultimo_login: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @OneToMany(() => OrganizationMember, (m) => m.user)
  membresias: OrganizationMember[];

  @OneToMany(() => PlatformAuditLog, (l) => l.actor)
  auditLogs: PlatformAuditLog[];
}
