import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthRepository } from './auth.repository';
import { OperationsRepository } from './operations.repository';
import { TenantRepository } from './tenant.repository';
import { BillingRepository } from './billing.repository';
import { PassengerRepository } from './passenger.repository';
import { SyncRepository } from './sync.repository';

// Entities
import { User } from '../entities/auth/user.entity';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { TerminalAssignment } from '../entities/auth/terminal-assignment.entity';
import { Organization } from '../entities/tenant/organization.entity';
import { Terminal } from '../entities/tenant/terminal.entity';
import { Plan } from '../entities/billing/plan.entity';
import { PlanLimit } from '../entities/billing/plan-limit.entity';
import { Subscription } from '../entities/billing/subscription.entity';
import { Despacho } from '../entities/operations/despacho.entity';
import { Anden } from '../entities/operations/anden.entity';
import { Unidad } from '../entities/operations/unidad.entity';
import { Conductor } from '../entities/operations/conductor.entity';
import { Destino } from '../entities/operations/destino.entity';
import { DespachoAuditLog } from '../entities/operations/despacho-audit-log.entity';
import { LineaTransporte } from '../entities/operations/linea-transporte.entity';
import { Pasajero } from '../entities/operations/pasajero.entity';
import { Abordaje } from '../entities/operations/abordaje.entity';
import { SesionConductor } from '../entities/operations/sesion-conductor.entity';
import { SyncChangeLog } from '../entities/operations/sync-changelog.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      OrganizationMember,
      TerminalAssignment,
      Organization,
      Terminal,
      Plan,
      PlanLimit,
      Subscription,
      Despacho,
      Anden,
      Unidad,
      Conductor,
      Destino,
      DespachoAuditLog,
      LineaTransporte,
      Pasajero,
      Abordaje,
      SesionConductor,
      SyncChangeLog,
    ]),
  ],
  providers: [
    AuthRepository,
    OperationsRepository,
    TenantRepository,
    BillingRepository,
    PassengerRepository,
    SyncRepository,
  ],
  exports: [
    AuthRepository,
    OperationsRepository,
    TenantRepository,
    BillingRepository,
    PassengerRepository,
    SyncRepository,
  ],
})
export class RepositoriesModule {}
