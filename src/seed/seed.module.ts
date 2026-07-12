import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../entities/tenant/organization.entity';
import { Terminal } from '../entities/tenant/terminal.entity';
import { User } from '../entities/auth/user.entity';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { TerminalAssignment } from '../entities/auth/terminal-assignment.entity';
import { Plan } from '../entities/billing/plan.entity';
import { PlanLimit } from '../entities/billing/plan-limit.entity';
import { Subscription } from '../entities/billing/subscription.entity';
import { LineaTransporte } from '../entities/operations/linea-transporte.entity';
import { Unidad } from '../entities/operations/unidad.entity';
import { Conductor } from '../entities/operations/conductor.entity';
import { Destino } from '../entities/operations/destino.entity';
import { Anden } from '../entities/operations/anden.entity';
import { Despacho } from '../entities/operations/despacho.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Terminal,
      User,
      OrganizationMember,
      TerminalAssignment,
      Plan,
      PlanLimit,
      Subscription,
      LineaTransporte,
      Unidad,
      Conductor,
      Destino,
      Anden,
      Despacho,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
