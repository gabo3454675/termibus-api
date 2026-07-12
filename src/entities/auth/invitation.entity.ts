import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvitationStatus, OrganizationRole } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';
import { User } from './user.entity';

@Entity('invitation')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  email: string;

  @Column({ type: 'varchar' })
  rol: OrganizationRole;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'varchar', nullable: true })
  invitado_por: string | null;

  @Column({ type: 'datetime' })
  expira_en: Date;

  @Column({ type: 'datetime', nullable: true })
  aceptada_en: Date | null;

  @Column({ type: 'varchar', default: InvitationStatus.PENDING })
  estado: InvitationStatus;

  @CreateDateColumn({ type: 'datetime' })
  creado_en: Date;

  @ManyToOne(() => Organization, (o) => o.invitaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitado_por' })
  invitador: User | null;
}
