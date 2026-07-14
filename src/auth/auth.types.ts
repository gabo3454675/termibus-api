import {
  OrganizationRole,
  Rol,
  TerminalRole,
} from '../common/enums';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { TerminalAssignment } from '../entities/auth/terminal-assignment.entity';
import { User } from '../entities/auth/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  organizationId: string;
  role: OrganizationRole;
  terminalId: string | null;
  conductorId: string | null;
  tokenVersion: number;
  /** Indicador de super-admin de plataforma (multi-tenant) */
  isPlatformAdmin: boolean;
}

export interface AuthUser {
  id: string;
  sub: string;
  email: string;
  orgId: string;
  organizationId: string;
  role: OrganizationRole;
  terminalId: string | null;
  conductorId: string | null;
  tokenVersion: number;
  isPlatformAdmin: boolean;
  /** Rol legacy para compatibilidad con guards existentes */
  rol: Rol;
  /** Alias legacy */
  username: string;
  nombre_completo: string;
  /** Campos computados desde BD (no en JWT) */
  orgRole: OrganizationRole;
  terminalRole: TerminalRole | null;
  /** Legacy snake_case para compatibilidad con controladores existentes */
  terminal_id: string | null;
  conductor_id: string | null;
  token_version: number;
}

export function resolveLegacyRol(
  orgRole: OrganizationRole,
  terminalRole: TerminalRole | null,
  conductorId: string | null,
): Rol {
  if (conductorId) return Rol.CONDUCTOR;
  if (terminalRole === TerminalRole.DESPACHADOR) return Rol.DESPACHADOR;
  if (
    orgRole === OrganizationRole.OWNER ||
    orgRole === OrganizationRole.ADMIN
  ) {
    return Rol.ADMIN;
  }
  if (terminalRole === TerminalRole.VIEWER) return Rol.DESPACHADOR;
  return Rol.ADMIN;
}

export function buildAuthContext(
  user: User,
  membership: OrganizationMember,
  assignment: TerminalAssignment | null,
): AuthUser {
  const terminalRole = assignment?.rol ?? null;
  const terminalId = assignment?.terminal_id ?? null;
  const conductorId = user.conductor_id;
  const orgRole = membership.rol;
  const rol = resolveLegacyRol(orgRole, terminalRole, conductorId);

  return {
    id: user.id,
    sub: user.id,
    email: user.email,
    orgId: membership.organization_id,
    organizationId: membership.organization_id,
    role: orgRole,
    terminalId,
    conductorId,
    tokenVersion: user.token_version,
    isPlatformAdmin: user.is_platform_admin,
    rol,
    username: user.email.split('@')[0],
    nombre_completo: user.nombre_completo,
    orgRole,
    terminalRole,
    terminal_id: terminalId,
    conductor_id: conductorId,
    token_version: user.token_version,
  };
}
