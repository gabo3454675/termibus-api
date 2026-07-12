import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DespachoAuditLog } from '../entities/despacho-audit-log.entity';
import { AuditLogService } from './audit-log.service';
import type { DespachoEstadoCambiadoPayload } from '../events/despacho.events';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditRepo: Repository<DespachoAuditLog>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(DespachoAuditLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    auditRepo = module.get<Repository<DespachoAuditLog>>(
      getRepositoryToken(DespachoAuditLog),
    );

    jest.clearAllMocks();
  });

  describe('handleEstadoCambiado', () => {
    it('should persist audit entry on estado cambiado event', async () => {
      const payload: DespachoEstadoCambiadoPayload = {
        despachoId: 'd-123',
        estadoAnterior: 'EN_COLA',
        estadoNuevo: 'ASIGNADO',
        timestamp: new Date(),
        usuarioId: 'u-456',
        razon: 'Asignación manual',
        organizationId: 'org-1',
      };

      const createdEntry = { id: 'audit-1', ...payload };
      mockRepo.create.mockReturnValue(createdEntry);
      mockRepo.save.mockResolvedValue(createdEntry);

      await service.handleEstadoCambiado(payload);

      expect(mockRepo.create).toHaveBeenCalledWith({
        despacho_id: 'd-123',
        estado_anterior: 'EN_COLA',
        estado_nuevo: 'ASIGNADO',
        usuario_id: 'u-456',
        razon: 'Asignación manual',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(createdEntry);
    });

    it('should persist with null usuario_id and razon when not provided', async () => {
      const payload: DespachoEstadoCambiadoPayload = {
        despachoId: 'd-123',
        estadoAnterior: null,
        estadoNuevo: 'EN_COLA',
        timestamp: new Date(),
        organizationId: 'org-1',
      };

      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue({});

      await service.handleEstadoCambiado(payload);

      expect(mockRepo.create).toHaveBeenCalledWith({
        despacho_id: 'd-123',
        estado_anterior: null,
        estado_nuevo: 'EN_COLA',
        usuario_id: null,
        razon: null,
      });
    });

    it('should not throw when persistence fails (fail-safe)', async () => {
      const payload: DespachoEstadoCambiadoPayload = {
        despachoId: 'd-123',
        estadoAnterior: 'EN_COLA',
        estadoNuevo: 'ASIGNADO',
        timestamp: new Date(),
        organizationId: 'org-1',
      };

      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(new Error('DB connection lost'));

      // No debe propagar la excepción
      await expect(service.handleEstadoCambiado(payload)).resolves.toBeUndefined();
    });
  });

  describe('getHistorial', () => {
    it('should return audit logs ordered by creado_en ASC', async () => {
      const logs = [
        { id: '1', creado_en: new Date('2025-01-01T10:00:00Z') },
        { id: '2', creado_en: new Date('2025-01-01T10:05:00Z') },
      ] as DespachoAuditLog[];

      mockRepo.find.mockResolvedValue(logs);

      const result = await service.getHistorial('d-123');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { despacho_id: 'd-123' },
        order: { creado_en: 'ASC' },
      });
      expect(result).toEqual(logs);
    });

    it('should return empty array when no history exists', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getHistorial('d-nonexistent');

      expect(result).toEqual([]);
    });
  });
});
