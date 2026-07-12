import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OrganizationFeature } from './organization-feature.entity';

@Entity('feature_flag')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  default_enabled: boolean;

  @OneToMany(() => OrganizationFeature, (of) => of.featureFlag)
  organizationFeatures: OrganizationFeature[];
}
