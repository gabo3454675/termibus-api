import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Organization } from '../../entities/tenant/organization.entity';
import { Terminal } from '../../entities/tenant/terminal.entity';
import { OrganizationMember } from '../../entities/auth/organization-member.entity';
import { Invitation } from '../../entities/auth/invitation.entity';
import { User } from '../../entities/auth/user.entity';
import { Subscription } from '../../entities/billing/subscription.entity';
import {
  OrganizationRole,
  InvitationStatus,
  PlanResource,
} from '../../common/enums';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';
import { TrackMetric } from '../../common/metrics/track-metric.decorator';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLog: PlatformAuditLogService,
    private readonly metricsService: MetricsService,
  ) {}

  // === MIEMBROS ===

  @TrackMetric('org.members.list')
  async findMembers(orgId: string, take = 50, skip = 0) {
    const [members, total] = await this.memberRepo.findAndCount({
      where: { organization_id: orgId, activo: true },
      relations: { user: true, asignaciones: true },
      take,
      skip,
    });

    const data = members.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      email: m.user?.email,
      nombre_completo: m.user?.nombre_completo,
      rol: m.rol,
      activo: m.activo,
      terminales: m.asignaciones
        ?.filter((a) => a.activo)
        .map((a) => ({ terminal_id: a.terminal_id, rol: a.rol })),
      creado_en: (m as any).creado_en,
    }));

    return { success: true, data, meta: { total, take, skip } };
  }

  @TrackMetric('org.members.change_role')
  async changeMemberRole(
    orgId: string,
    memberId: string,
    newRole: OrganizationRole,
    requestingUserRole: OrganizationRole,
  ) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organization_id: orgId, activo: true },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');

    // Un OWNER no puede ser degradado por otro miembro
    if (
      member.rol === OrganizationRole.OWNER &&
      requestingUserRole !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException('No puedes cambiar el rol del propietario');
    }

    // Solo OWNER puede crear otros OWNER
    if (
      newRole === OrganizationRole.OWNER &&
      requestingUserRole !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException(
        'Solo el propietario puede asignar rol OWNER',
      );
    }

    member.rol = newRole;
    await this.memberRepo.save(member);

    await this.auditLog.log({
      action: 'member.role_changed',
      resource_type: 'organization_member',
      resource_id: memberId,
      metadata: { new_role: newRole },
    });

    return { success: true, data: { id: memberId, rol: newRole } };
  }

  @TrackMetric('org.members.deactivate')
  async deactivateMember(
    orgId: string,
    memberId: string,
    requestingUserRole: OrganizationRole,
  ) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, organization_id: orgId, activo: true },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');

    // No permitir desactivar al OWNER
    if (member.rol === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'No puedes desactivar al propietario de la organización',
      );
    }

    member.activo = false;
    await this.memberRepo.save(member);

    await this.auditLog.log({
      action: 'member.deactivated',
      resource_type: 'organization_member',
      resource_id: memberId,
    });

    return { success: true, data: { id: memberId, activo: false } };
  }

  // === INVITACIONES ===

  @TrackMetric('org.invitations.create')
  async createInvitation(
    orgId: string,
    data: { email: string; rol: OrganizationRole },
    invitedBy: string,
  ) {
    // Verificar que el email no sea ya miembro
    const user = await this.userRepo.findOne({ where: { email: data.email } });
    if (user) {
      const isMember = await this.memberRepo.findOne({
        where: { user_id: user.id, organization_id: orgId, activo: true },
      });
      if (isMember)
        throw new ConflictException(
          'El usuario ya es miembro de esta organización',
        );
    }

    // Verificar invitación pendiente existente
    const pending = await this.invitationRepo.findOne({
      where: {
        organization_id: orgId,
        email: data.email,
        estado: InvitationStatus.PENDING,
      },
    });
    if (pending)
      throw new ConflictException(
        'Ya existe una invitación pendiente para este email',
      );

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = this.invitationRepo.create({
      organization_id: orgId,
      email: data.email,
      rol: data.rol,
      token,
      invitado_por: invitedBy,
      expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      estado: InvitationStatus.PENDING,
    });
    const saved = await this.invitationRepo.save(invitation);

    await this.auditLog.log({
      action: 'invitation.created',
      resource_type: 'invitation',
      resource_id: saved.id,
      metadata: { email: data.email, rol: data.rol },
    });

    return {
      success: true,
      data: {
        id: saved.id,
        email: saved.email,
        rol: saved.rol,
        token: saved.token,
        expira_en: saved.expira_en,
      },
    };
  }

  @TrackMetric('org.invitations.list')
  async findInvitations(orgId: string) {
    const invitations = await this.invitationRepo.find({
      where: { organization_id: orgId },
      order: { creado_en: 'DESC' },
    });
    return { success: true, data: invitations };
  }

  @TrackMetric('org.invitations.revoke')
  async revokeInvitation(orgId: string, invitationId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, organization_id: orgId },
    });
    if (!invitation) throw new NotFoundException('Invitación no encontrada');

    invitation.estado = InvitationStatus.REVOKED;
    await this.invitationRepo.save(invitation);

    await this.auditLog.log({
      action: 'invitation.revoked',
      resource_type: 'invitation',
      resource_id: invitationId,
    });

    return {
      success: true,
      data: { id: invitationId, estado: InvitationStatus.REVOKED },
    };
  }

  // === TERMINALES ===

  @TrackMetric('org.terminals.list')
  async findTerminals(orgId: string) {
    const terminals = await this.terminalRepo.find({
      where: { organization_id: orgId },
      order: { nombre: 'ASC' },
    });
    return { success: true, data: terminals };
  }

  @TrackMetric('org.terminals.create')
  async createTerminal(
    orgId: string,
    data: {
      nombre: string;
      slug: string;
      direccion: string;
      ciudad: string;
      pago_movil_banco?: string;
      pago_movil_telefono?: string;
      pago_movil_cedula_rif?: string;
      pago_movil_titular?: string;
    },
  ) {
    // Validar límite de terminales según plan
    const sub = await this.subscriptionRepo.findOne({
      where: { organization_id: orgId },
      relations: { plan: { limites: true } },
    });

    if (sub?.plan?.limites) {
      const terminalLimit = sub.plan.limites.find(
        (l) => l.recurso === PlanResource.TERMINALES,
      );
      if (terminalLimit && terminalLimit.limite !== -1) {
        const currentCount = await this.terminalRepo.count({
          where: { organization_id: orgId, activo: true },
        });
        if (currentCount >= terminalLimit.limite) {
          throw new BadRequestException(
            `Has alcanzado el límite de ${terminalLimit.limite} terminales en tu plan.`,
          );
        }
      }
    }

    // Validar slug único dentro de la org
    const existing = await this.terminalRepo.findOne({
      where: { organization_id: orgId, slug: data.slug },
    });
    if (existing)
      throw new ConflictException(
        'Ya existe una terminal con ese slug en esta organización',
      );

    const terminal = this.terminalRepo.create({
      organization_id: orgId,
      nombre: data.nombre,
      slug: data.slug,
      direccion: data.direccion,
      ciudad: data.ciudad,
      pago_movil_banco: data.pago_movil_banco ?? null,
      pago_movil_telefono: data.pago_movil_telefono ?? null,
      pago_movil_cedula_rif: data.pago_movil_cedula_rif ?? null,
      pago_movil_titular: data.pago_movil_titular ?? null,
    });
    const saved = await this.terminalRepo.save(terminal);

    await this.auditLog.log({
      action: 'terminal.created',
      resource_type: 'terminal',
      resource_id: saved.id,
      metadata: { nombre: data.nombre, slug: data.slug },
    });

    return { success: true, data: saved };
  }

  @TrackMetric('org.terminals.update')
  async updateTerminal(
    orgId: string,
    terminalId: string,
    data: {
      nombre?: string;
      slug?: string;
      direccion?: string;
      ciudad?: string;
      pago_movil_banco?: string;
      pago_movil_telefono?: string;
      pago_movil_cedula_rif?: string;
      pago_movil_titular?: string;
    },
  ) {
    const terminal = await this.terminalRepo.findOne({
      where: { id: terminalId, organization_id: orgId },
    });
    if (!terminal) throw new NotFoundException('Terminal no encontrada');

    // Si cambia slug, verificar único
    if (data.slug && data.slug !== terminal.slug) {
      const existing = await this.terminalRepo.findOne({
        where: { organization_id: orgId, slug: data.slug },
      });
      if (existing)
        throw new ConflictException(
          'Ya existe una terminal con ese slug en esta organización',
        );
    }

    await this.terminalRepo.update(terminalId, data);
    const updated = await this.terminalRepo.findOne({
      where: { id: terminalId },
    });

    await this.auditLog.log({
      action: 'terminal.updated',
      resource_type: 'terminal',
      resource_id: terminalId,
      metadata: { changes: Object.keys(data) },
    });

    return { success: true, data: updated };
  }

  @TrackMetric('org.terminals.deactivate')
  async deactivateTerminal(orgId: string, terminalId: string) {
    const terminal = await this.terminalRepo.findOne({
      where: { id: terminalId, organization_id: orgId },
    });
    if (!terminal) throw new NotFoundException('Terminal no encontrada');

    terminal.activo = false;
    await this.terminalRepo.save(terminal);

    await this.auditLog.log({
      action: 'terminal.deactivated',
      resource_type: 'terminal',
      resource_id: terminalId,
    });

    return { success: true, data: { id: terminalId, activo: false } };
  }
}
