import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { OrganizationMember } from '../entities/auth/organization-member.entity';
import { TerminalAssignment } from '../entities/auth/terminal-assignment.entity';
import { User } from '../entities/auth/user.entity';
import { buildAuthContext, JwtPayload } from './auth.types';

const DEMO_EMAIL_ALIASES: Record<string, string> = {
  admin: 'admin@termibus-demo.com',
  despachador: 'despachador.norte@termibus-demo.com',
  conductor: 'conductor@termibus-demo.com',
  superadmin: 'super_admin@termibus-demo.com',
};

function isDemoMode(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_ALIASES === 'true';
}

@Injectable()
export class AuthService {
  private readonly dummyHash: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(TerminalAssignment)
    private readonly assignmentRepo: Repository<TerminalAssignment>,
    private readonly jwtService: JwtService,
  ) {
    this.dummyHash = bcrypt.hashSync('dummy-padding-hash', 10);
  }

  private resolveEmail(identifier: string): string {
    const normalized = identifier.trim().toLowerCase();
    if (isDemoMode()) {
      const resolved = DEMO_EMAIL_ALIASES[normalized];
      if (resolved) return resolved;
    }
    return normalized;
  }

  async login(identifier: string, password: string, organizationId?: string) {
    const email = this.resolveEmail(identifier);
    const user = await this.userRepo.findOne({
      where: { email, activo: true },
    });

    if (!user) {
      // Timing normalization: run compare against dummy hash so timing is identical
      await bcrypt.compare(password, this.dummyHash);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const memberships = await this.memberRepo.find({
      where: { user_id: user.id, activo: true },
      relations: { organization: true },
    });
    if (!memberships.length) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const membership = organizationId
      ? memberships.find((m) => m.organization_id === organizationId)
      : memberships[0];
    if (!membership) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const assignment = await this.assignmentRepo.findOne({
      where: {
        organization_member_id: membership.id,
        activo: true,
      },
    });

    const authUser = buildAuthContext(user, membership, assignment);

    await this.userRepo.update(user.id, { ultimo_login: new Date() });

    const payload: JwtPayload = {
      sub: authUser.sub,
      email: authUser.email,
      orgId: authUser.orgId,
      organizationId: authUser.orgId,
      role: authUser.orgRole,
      terminalId: authUser.terminalId,
      conductorId: authUser.conductorId,
      tokenVersion: authUser.tokenVersion,
      isPlatformAdmin: authUser.isPlatformAdmin,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        rol: authUser.rol,
        org_id: authUser.orgId,
        org_role: authUser.orgRole,
        is_platform_admin: authUser.isPlatformAdmin,
        nombre_completo: authUser.nombre_completo,
        terminal_id: authUser.terminal_id,
        conductor_id: authUser.conductor_id,
      },
    };
  }

  async validateUser(userId: string) {
    return this.userRepo.findOne({ where: { id: userId, activo: true } });
  }

  async getMembership(userId: string, orgId: string) {
    return this.memberRepo.findOne({
      where: { user_id: userId, organization_id: orgId, activo: true },
    });
  }

  async getTerminalAssignment(memberId: string) {
    return this.assignmentRepo.findOne({
      where: { organization_member_id: memberId, activo: true },
    });
  }
}
