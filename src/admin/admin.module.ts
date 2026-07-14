import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controllers/admin.controller';
import { OrganizationController } from './controllers/organization.controller';
import { AdminMetricsController } from './controllers/admin-metrics.controller';
import { AdminOrganizationsService } from './services/admin-organizations.service';
import { AdminBillingService } from './services/admin-billing.service';
import { AdminPlatformService } from './services/admin-platform.service';
import { AdminMetricsService } from './services/admin-metrics.service';
import { OrganizationService } from './services/organization.service';

// Entities needed for TypeORM injection in services
import { Organization } from '../entities/tenant/organization.entity';
import { Terminal } from '../entities/tenant/terminal.entity';
import { Plan } from '../entities/billing/plan.entity';
import { PlanLimit } from '../entities/billing/plan-limit.entity';
import { Subscription } from '../entities/billing/subscription.entity';
import { Invoice } from '../entities/billing/invoice.entity';
import { UsageRecord } from '../entities/billing/usage-record.entity';
import { FeatureFlag } from '../entities/platform/feature-flag.entity';
import { OrganizationFeature } from '../entities/platform/organization-feature.entity';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { Invitation } from '../entities/auth/invitation.entity';
import { User } from '../entities/auth/user.entity';
import { PlatformAuditLog } from '../entities/platform/platform-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Terminal,
      Plan,
      PlanLimit,
      Subscription,
      Invoice,
      UsageRecord,
      FeatureFlag,
      OrganizationFeature,
      OrganizationMember,
      Invitation,
      User,
      PlatformAuditLog,
    ]),
  ],
  controllers: [
    AdminController,
    OrganizationController,
    AdminMetricsController,
  ],
  providers: [
    AdminOrganizationsService,
    AdminBillingService,
    AdminPlatformService,
    AdminMetricsService,
    OrganizationService,
  ],
  exports: [
    AdminOrganizationsService,
    AdminBillingService,
    AdminPlatformService,
    AdminMetricsService,
    OrganizationService,
  ],
})
export class AdminModule {}
