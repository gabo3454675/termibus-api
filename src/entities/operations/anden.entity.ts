import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EstadoAnden } from '../../common/enums';
import { Organization } from '../tenant/organization.entity';
import { Terminal } from '../tenant/terminal.entity';

@Entity('anden')
@Unique(['terminal_id', 'numero'])
export class Anden {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column({ type: 'int' })
  numero: number;

  @Column({ type: 'varchar', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', default: EstadoAnden.LIBRE })
  estado: EstadoAnden;

  @Column()
  terminal_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Terminal, (t) => t.andenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'terminal_id' })
  terminal: Terminal;
}
