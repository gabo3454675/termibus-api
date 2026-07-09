import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sync_changelog')
export class SyncChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  entity: string; // 'despacho', 'anden', 'unidad', etc.

  @Column({ type: 'varchar' })
  entityId: string;

  @Column({ type: 'varchar' })
  action: 'CREATE' | 'UPDATE' | 'DELETE';

  @Column({ type: 'json', nullable: true })
  data: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'datetime' })
  timestamp: Date;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  terminalId: string | null;
}
