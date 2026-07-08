import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncService } from './sync.service';
import { SyncChangeLog } from '../entities/sync-changelog.entity';

describe('SyncService', () => {
  let service: SyncService;
  let repo: Repository<SyncChangeLog>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: getRepositoryToken(SyncChangeLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    repo = module.get<Repository<SyncChangeLog>>(
      getRepositoryToken(SyncChangeLog),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerChange', () => {
    it('debe crear y guardar una entrada en el changelog', async () => {
      const params = {
        entity: 'despacho',
        entityId: '123',
        action: 'CREATE' as const,
        data: { estado: 'EN_COLA' },
        userId: 'user-1',
        terminalId: 'term-1',
      };

      const createdEntry = { id: 'log-1', ...params };
      mockRepo.create.mockReturnValue(createdEntry);
      mockRepo.save.mockResolvedValue(createdEntry);

      const result = await service.registerChange(params);

      expect(mockRepo.create).toHaveBeenCalledWith({
        entity: 'despacho',
        entityId: '123',
        action: 'CREATE',
        data: { estado: 'EN_COLA' },
        userId: 'user-1',
        terminalId: 'term-1',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(createdEntry);
      expect(result).toEqual(createdEntry);
    });

    it('debe usar null cuando no se proveen userId/terminalId', async () => {
      const params = {
        entity: 'unidad',
        entityId: '456',
        action: 'UPDATE' as const,
      };

      const createdEntry = {
        id: 'log-2',
        ...params,
        data: null,
        userId: null,
        terminalId: null,
      };
      mockRepo.create.mockReturnValue(createdEntry);
      mockRepo.save.mockResolvedValue(createdEntry);

      const result = await service.registerChange(params);

      expect(mockRepo.create).toHaveBeenCalledWith({
        entity: 'unidad',
        entityId: '456',
        action: 'UPDATE',
        data: null,
        userId: null,
        terminalId: null,
      });
      expect(result).toEqual(createdEntry);
    });
  });

  describe('getChangesSince', () => {
    it('debe retornar cambios desde un timestamp', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: '1', entity: 'despacho', entityId: '123', action: 'CREATE' },
        ]),
      };

      mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getChangesSince('2026-07-07T00:00:00Z');

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('cl');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'cl.timestamp >= :since',
        { since: new Date('2026-07-07T00:00:00Z') },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('cl.timestamp', 'ASC');
      expect(result.changes).toHaveLength(1);
      expect(result.serverTimestamp).toBeDefined();
      expect(typeof result.serverTimestamp).toBe('string');
    });

    it('debe filtrar por entidad cuando se provee', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getChangesSince('2026-07-07T00:00:00Z', {
        entity: 'despacho',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cl.entity = :entity',
        { entity: 'despacho' },
      );
    });

    it('debe limitar resultados cuando se provee limit', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getChangesSince('2026-07-07T00:00:00Z', { limit: 50 });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  describe('cleanOlderThan', () => {
    it('debe eliminar registros anteriores a la fecha y retornar el conteo', async () => {
      const date = new Date('2026-01-01T00:00:00Z');
      mockRepo.delete.mockResolvedValue({ affected: 5, raw: {} });

      const result = await service.cleanOlderThan(date);

      expect(mockRepo.delete).toHaveBeenCalledWith({
        timestamp: expect.objectContaining({
          _type: 'lessThan',
          _value: date,
        }),
      });
      expect(result).toBe(5);
    });
  });
});
