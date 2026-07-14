import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { Organization } from '../../entities/tenant/organization.entity';
import { Terminal } from '../../entities/tenant/terminal.entity';
import { OrganizationMember } from '../../entities/auth/organization-member.entity';
import { Invitation } from '../../entities/auth/invitation.entity';
import { User } from '../../entities/auth/user.entity';
import { Subscription } from '../../entities/billing/subscription.entity';
import { OrganizationRole, InvitationStatus } from '../../common/enums';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let memberRepo: Repository<OrganizationMember>;
  let invitationRepo: Repository<Invitation>;
  let userRepo: Repository<User>;

  const mockOrgId = 'org-001';
  const mockUserId = 'user-001';
  const mockMemberId = 'member-001';
  const mockInvitationId = 'invitation-001';

  const mockManager = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockMember: OrganizationMember = {
    id: mockMemberId,
    organization_id: mockOrgId,
    user_id: mockUserId,
    rol: OrganizationRole.MEMBER,
    activo: true,
    creado_en: new Date(),
    organization: null as any,
    user: {
      id: mockUserId,
      email: 'user@test.com',
      nombre_completo: 'Usuario Test',
      password_hash: 'hash',
      activo: true,
      is_platform_admin: false,
      conductor_id: null,
      token_version: 1,
      ultimo_login: null,
      creado_en: new Date(),
      membresias: [],
      auditLogs: [],
    },
    asignaciones: [],
  };

  const mockInvitation: Invitation = {
    id: mockInvitationId,
    organization_id: mockOrgId,
    email: 'invited@test.com',
    rol: OrganizationRole.MEMBER,
    token: 'mock-token-123',
    invitado_por: mockUserId,
    expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    aceptada_en: null,
    estado: InvitationStatus.PENDING,
    creado_en: new Date(),
    organization: null as any,
    invitador: null as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: getRepositoryToken(Organization),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Terminal),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(OrganizationMember),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            manager: mockManager,
          },
        },
        {
          provide: getRepositoryToken(Invitation),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: PlatformAuditLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: MetricsService,
          useValue: { incrementCounter: jest.fn(), observeHistogram: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    memberRepo = module.get<Repository<OrganizationMember>>(
      getRepositoryToken(OrganizationMember),
    );
    invitationRepo = module.get<Repository<Invitation>>(
      getRepositoryToken(Invitation),
    );
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  // ============================================================
  // findMembers
  // ============================================================

  describe('findMembers', () => {
    it('debe retornar lista de miembros con datos del usuario y terminales', async () => {
      jest.spyOn(memberRepo, 'findAndCount').mockResolvedValue([[mockMember], 1]);

      const result = await service.findMembers(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockMemberId);
      expect(result.data[0].email).toBe('user@test.com');
      expect(result.data[0].nombre_completo).toBe('Usuario Test');
      expect(result.data[0].rol).toBe(OrganizationRole.MEMBER);
      expect(result.meta).toEqual({ total: 1, take: 50, skip: 0 });
      expect(memberRepo.findAndCount).toHaveBeenCalledWith({
        where: { organization_id: mockOrgId, activo: true },
        relations: { user: true, asignaciones: true },
        take: 50,
        skip: 0,
      });
    });

    it('debe retornar array vacío si no hay miembros', async () => {
      jest.spyOn(memberRepo, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.findMembers(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.meta).toEqual({ total: 0, take: 50, skip: 0 });
    });

    it('debe aplicar take y skip personalizados', async () => {
      jest.spyOn(memberRepo, 'findAndCount').mockResolvedValue([[mockMember], 30]);

      const result = await service.findMembers(mockOrgId, 15, 10);

      expect(result.meta).toEqual({ total: 30, take: 15, skip: 10 });
      expect(memberRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 15, skip: 10 }),
      );
    });
  });

  // ============================================================
  // changeMemberRole
  // ============================================================

  describe('changeMemberRole', () => {
    it('debe cambiar el rol del miembro correctamente', async () => {
      const memberToUpdate = {
        ...mockMember,
        id: 'member-002',
        rol: OrganizationRole.MEMBER,
      };
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(memberToUpdate);
      jest.spyOn(memberRepo, 'save').mockResolvedValue({
        ...memberToUpdate,
        rol: OrganizationRole.ADMIN,
      });

      const result = await service.changeMemberRole(
        mockOrgId,
        'member-002',
        OrganizationRole.ADMIN,
        OrganizationRole.OWNER,
      );

      expect(result.success).toBe(true);
      expect(result.data.rol).toBe(OrganizationRole.ADMIN);
    });

    it('debe lanzar NotFoundException si el miembro no existe', async () => {
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.changeMemberRole(
          mockOrgId,
          'member-inexistente',
          OrganizationRole.ADMIN,
          OrganizationRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si se intenta degradar al OWNER sin ser OWNER', async () => {
      const ownerMember = { ...mockMember, rol: OrganizationRole.OWNER };
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(ownerMember);

      await expect(
        service.changeMemberRole(
          mockOrgId,
          mockMemberId,
          OrganizationRole.MEMBER,
          OrganizationRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si no-OWNER intenta asignar rol OWNER', async () => {
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(mockMember);

      await expect(
        service.changeMemberRole(
          mockOrgId,
          mockMemberId,
          OrganizationRole.OWNER,
          OrganizationRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // deactivateMember
  // ============================================================

  describe('deactivateMember', () => {
    it('debe desactivar un miembro correctamente', async () => {
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(mockMember);
      jest
        .spyOn(memberRepo, 'save')
        .mockResolvedValue({ ...mockMember, activo: false });

      const result = await service.deactivateMember(
        mockOrgId,
        mockMemberId,
        OrganizationRole.OWNER,
      );

      expect(result.success).toBe(true);
      expect(result.data.activo).toBe(false);
    });

    it('debe lanzar NotFoundException si el miembro no existe', async () => {
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.deactivateMember(
          mockOrgId,
          'member-inexistente',
          OrganizationRole.OWNER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si se intenta desactivar al OWNER', async () => {
      const ownerMember = { ...mockMember, rol: OrganizationRole.OWNER };
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(ownerMember);

      await expect(
        service.deactivateMember(
          mockOrgId,
          mockMemberId,
          OrganizationRole.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // createInvitation
  // ============================================================

  describe('createInvitation', () => {
    it('debe crear una invitación correctamente', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(invitationRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(invitationRepo, 'create').mockReturnValue(mockInvitation);
      jest.spyOn(invitationRepo, 'save').mockResolvedValue(mockInvitation);

      const result = await service.createInvitation(
        mockOrgId,
        { email: 'invited@test.com', rol: OrganizationRole.MEMBER },
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('invited@test.com');
      expect(result.data.rol).toBe(OrganizationRole.MEMBER);
      expect(result.data.token).toBeDefined();
      expect(invitationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: mockOrgId,
          email: 'invited@test.com',
          rol: OrganizationRole.MEMBER,
          estado: InvitationStatus.PENDING,
        }),
      );
    });

    it('debe lanzar ConflictException si el usuario ya es miembro', async () => {
      // Simular que existe un usuario con ese email
      jest
        .spyOn(userRepo, 'findOne')
        .mockResolvedValue({ id: 'existing-user' } as any);

      jest
        .spyOn(memberRepo, 'findOne')
        .mockResolvedValueOnce(mockMember); // verificar si es miembro

      await expect(
        service.createInvitation(
          mockOrgId,
          { email: 'existing@test.com', rol: OrganizationRole.MEMBER },
          mockUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException si ya hay invitación pendiente', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(memberRepo, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(invitationRepo, 'findOne')
        .mockResolvedValue(mockInvitation);

      await expect(
        service.createInvitation(
          mockOrgId,
          { email: 'invited@test.com', rol: OrganizationRole.MEMBER },
          mockUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================
  // findInvitations
  // ============================================================

  describe('findInvitations', () => {
    it('debe retornar lista de invitaciones ordenadas por fecha descendente', async () => {
      jest
        .spyOn(invitationRepo, 'find')
        .mockResolvedValue([mockInvitation]);

      const result = await service.findInvitations(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockInvitationId);
      expect(invitationRepo.find).toHaveBeenCalledWith({
        where: { organization_id: mockOrgId },
        order: { creado_en: 'DESC' },
      });
    });

    it('debe retornar array vacío si no hay invitaciones', async () => {
      jest.spyOn(invitationRepo, 'find').mockResolvedValue([]);

      const result = await service.findInvitations('org-sin-invitaciones');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  // ============================================================
  // revokeInvitation
  // ============================================================

  describe('revokeInvitation', () => {
    it('debe revocar una invitación correctamente', async () => {
      jest.spyOn(invitationRepo, 'findOne').mockResolvedValue(mockInvitation);
      jest
        .spyOn(invitationRepo, 'save')
        .mockResolvedValue({
          ...mockInvitation,
          estado: InvitationStatus.REVOKED,
        });

      const result = await service.revokeInvitation(
        mockOrgId,
        mockInvitationId,
      );

      expect(result.success).toBe(true);
      expect(result.data.estado).toBe(InvitationStatus.REVOKED);
    });

    it('debe lanzar NotFoundException si la invitación no existe', async () => {
      jest.spyOn(invitationRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.revokeInvitation(mockOrgId, 'invitation-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
