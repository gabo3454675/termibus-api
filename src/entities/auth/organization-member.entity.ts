import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OrganizationRole } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';
import { TerminalAssignment } from './terminal-assignment.entity';
import { User } from './user.entity';

@Entity('organization_member')
@Unique(['organization_id', 'user_id'])
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  user_id: string;

  @Column({ type: 'varchar' })
  rol: OrganizationRole;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Organization, (o) => o.miembros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, (u) => u.membresias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => TerminalAssignment, (a) => a.member)
  asignaciones: TerminalAssignment[];
}
