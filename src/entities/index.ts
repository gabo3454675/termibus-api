// Platform
export { PlatformAuditLog } from './platform/platform-audit-log.entity';
export { FeatureFlag } from './platform/feature-flag.entity';
export { OrganizationFeature } from './platform/organization-feature.entity';

// Tenant
export { Organization } from './tenant/organization.entity';
export { Terminal } from './tenant/terminal.entity';

// Billing
export { Plan } from './billing/plan.entity';
export { PlanLimit } from './billing/plan-limit.entity';
export { Subscription } from './billing/subscription.entity';
export { Invoice } from './billing/invoice.entity';
export { UsageRecord } from './billing/usage-record.entity';

// Auth
export { User } from './auth/user.entity';
export { OrganizationMember } from './auth/organization-member.entity';
export { TerminalAssignment } from './auth/terminal-assignment.entity';
export { Invitation } from './auth/invitation.entity';

// Operations
export { LineaTransporte } from './operations/linea-transporte.entity';
export { Unidad } from './operations/unidad.entity';
export { Conductor } from './operations/conductor.entity';
export { Destino } from './operations/destino.entity';
export { Anden } from './operations/anden.entity';
export { Despacho } from './operations/despacho.entity';
export { DespachoAuditLog } from './operations/despacho-audit-log.entity';
export { Pasajero } from './operations/pasajero.entity';
export { Abordaje } from './operations/abordaje.entity';
export { SesionConductor } from './operations/sesion-conductor.entity';
export { CierreTurno } from './operations/cierre-turno.entity';
export { SyncChangeLog } from './operations/sync-changelog.entity';

/** @deprecated Usar User */
export { User as Usuario } from './auth/user.entity';

// Array used by TypeOrmModule.forRoot()
import { PlatformAuditLog } from './platform/platform-audit-log.entity';
import { FeatureFlag } from './platform/feature-flag.entity';
import { OrganizationFeature } from './platform/organization-feature.entity';
import { Organization } from './tenant/organization.entity';
import { Terminal } from './tenant/terminal.entity';
import { Plan } from './billing/plan.entity';
import { PlanLimit } from './billing/plan-limit.entity';
import { Subscription } from './billing/subscription.entity';
import { Invoice } from './billing/invoice.entity';
import { UsageRecord } from './billing/usage-record.entity';
import { User } from './auth/user.entity';
import { OrganizationMember } from './auth/organization-member.entity';
import { TerminalAssignment } from './auth/terminal-assignment.entity';
import { Invitation } from './auth/invitation.entity';
import { LineaTransporte } from './operations/linea-transporte.entity';
import { Unidad } from './operations/unidad.entity';
import { Conductor } from './operations/conductor.entity';
import { Destino } from './operations/destino.entity';
import { Anden } from './operations/anden.entity';
import { Despacho } from './operations/despacho.entity';
import { DespachoAuditLog } from './operations/despacho-audit-log.entity';
import { Pasajero } from './operations/pasajero.entity';
import { Abordaje } from './operations/abordaje.entity';
import { SesionConductor } from './operations/sesion-conductor.entity';
import { CierreTurno } from './operations/cierre-turno.entity';
import { SyncChangeLog } from './operations/sync-changelog.entity';

export const entities = [
  PlatformAuditLog,
  FeatureFlag,
  OrganizationFeature,
  Organization,
  Terminal,
  Plan,
  PlanLimit,
  Subscription,
  Invoice,
  UsageRecord,
  User,
  OrganizationMember,
  TerminalAssignment,
  Invitation,
  LineaTransporte,
  Unidad,
  Conductor,
  Destino,
  Anden,
  Despacho,
  DespachoAuditLog,
  Pasajero,
  Abordaje,
  SesionConductor,
  CierreTurno,
  SyncChangeLog,
];
