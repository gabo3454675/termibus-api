import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TerminalRole } from '../../common/enums';
import { Terminal } from '../tenant/terminal.entity';
import { OrganizationMember } from './organization-member.entity';

@Entity('terminal_assignment')
@Unique(['organization_member_id', 'terminal_id'])
export class TerminalAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_member_id: string;

  @Column()
  terminal_id: string;

  @Column({ type: 'varchar' })
  rol: TerminalRole;

  @Column({ default: true })
  activo: boolean;

  @ManyToOne(() => OrganizationMember, (m) => m.asignaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_member_id' })
  member: OrganizationMember;

  @ManyToOne(() => Terminal, (t) => t.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;
}
