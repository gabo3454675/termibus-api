import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Organization } from '../tenant/organization.entity';
import { FeatureFlag } from './feature-flag.entity';

@Entity('organization_feature')
@Unique(['organization_id', 'feature_flag_id'])
export class OrganizationFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organization_id: string;

  @Column()
  feature_flag_id: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown> | null;

  @ManyToOne(() => Organization, (o) => o.features, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => FeatureFlag, (f) => f.organizationFeatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feature_flag_id' })
  featureFlag: FeatureFlag;
}
