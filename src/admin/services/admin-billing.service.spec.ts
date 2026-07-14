import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AdminBillingService } from './admin-billing.service';
import { Plan } from '../../entities/billing/plan.entity';
import { PlanLimit } from '../../entities/billing/plan-limit.entity';
import { Subscription } from '../../entities/billing/subscription.entity';
import { Invoice } from '../../entities/billing/invoice.entity';
import { UsageRecord } from '../../entities/billing/usage-record.entity';
import { SubscriptionStatus, InvoiceStatus, PlanResource } from '../../common/enums';
import { PlatformAuditLogService } from '../../common/audit/platform-audit-log.service';
import { MetricsService } from '../../common/metrics/metrics.service';

describe('AdminBillingService', () => {
  let service: AdminBillingService;
  let invoiceRepo: Repository<Invoice>;
  let usageRepo: Repository<UsageRecord>;
  let subscriptionRepo: Repository<Subscription>;
  let planRepo: Repository<Plan>;

  const mockOrgId = 'org-001';
  const mockSubId = 'sub-001';
  const mockPlanId = 'plan-001';

  const mockInvoice: Invoice = {
    id: 'inv-001',
    organization_id: mockOrgId,
    subscription_id: mockSubId,
    numero: 'INV-2025-001',
    monto_usd: 99.99,
    estado: InvoiceStatus.DRAFT,
    periodo_inicio: new Date('2025-01-01'),
    periodo_fin: new Date('2025-01-31'),
    stripe_invoice_id: null,
    pdf_url: null,
    creado_en: new Date(),
    organization: null as any,
    subscription: null as any,
  };

  const mockUsageRecords: UsageRecord[] = [
    {
      id: 'usage-001',
      organization_id: mockOrgId,
      recurso: PlanResource.TERMINALES,
      cantidad: 2,
      periodo: '2025-01',
      creado_en: new Date(),
      organization: null as any,
    },
    {
      id: 'usage-002',
      organization_id: mockOrgId,
      recurso: PlanResource.USUARIOS,
      cantidad: 10,
      periodo: '2025-01',
      creado_en: new Date(),
      organization: null as any,
    },
  ];

  const mockPlanLimits = [
    { id: 'lim-001', plan_id: mockPlanId, recurso: PlanResource.TERMINALES, limite: 5, plan: null as any },
    { id: 'lim-002', plan_id: mockPlanId, recurso: PlanResource.USUARIOS, limite: 20, plan: null as any },
    { id: 'lim-003', plan_id: mockPlanId, recurso: PlanResource.ANDENES, limite: 10, plan: null as any },
  ];

  const mockSubscription: Subscription = {
    id: mockSubId,
    organization_id: mockOrgId,
    plan_id: mockPlanId,
    estado: SubscriptionStatus.ACTIVE,
    periodo: null as any,
    trial_ends_at: null,
    current_period_start: new Date('2025-01-01'),
    current_period_end: new Date('2025-01-31'),
    cancelled_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    organization: null as any,
    plan: { id: mockPlanId, codigo: null as any, nombre: 'PRO', precio_mensual_usd: 99.99, precio_anual_usd: 999.99, activo: true, orden: 2, limites: mockPlanLimits, subscriptions: [] },
    facturas: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBillingService,
        {
          provide: getRepositoryToken(Plan),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlanLimit),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UsageRecord),
          useValue: {
            find: jest.fn(),
          },
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

    service = module.get<AdminBillingService>(AdminBillingService);
    invoiceRepo = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    usageRepo = module.get<Repository<UsageRecord>>(getRepositoryToken(UsageRecord));
    subscriptionRepo = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
    planRepo = module.get<Repository<Plan>>(getRepositoryToken(Plan));
  });

  // ============================================================
  // findAllInvoices
  // ============================================================

  describe('findAllInvoices', () => {
    it('debe retornar todas las facturas sin filtros con meta de paginación', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 1]);

      const result = await service.findAllInvoices();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('inv-001');
      expect(result.meta).toEqual({ total: 1, take: 50, skip: 0 });
      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: { organization: true },
        order: { periodo_inicio: 'DESC' },
        take: 50,
        skip: 0,
      });
    });

    it('debe filtrar por organization_id', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 1]);

      const result = await service.findAllInvoices({ organization_id: mockOrgId });

      expect(result.success).toBe(true);
      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organization_id: mockOrgId }),
        }),
      );
    });

    it('debe filtrar por estado', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 1]);

      await service.findAllInvoices({ estado: InvoiceStatus.DRAFT });

      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: InvoiceStatus.DRAFT }),
        }),
      );
    });

    it('debe filtrar por rango de fechas (date_from + date_to)', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 1]);

      await service.findAllInvoices({
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      });

      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            periodo_inicio: expect.any(Object),
          }),
        }),
      );
    });

    it('debe filtrar solo por date_from', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 1]);

      await service.findAllInvoices({ date_from: '2025-01-01' });

      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            periodo_inicio: expect.any(Object),
          }),
        }),
      );
    });

    it('debe aplicar take y skip personalizados', async () => {
      jest.spyOn(invoiceRepo, 'findAndCount').mockResolvedValue([[mockInvoice], 100]);

      const result = await service.findAllInvoices({ take: 10, skip: 20 });

      expect(result.meta).toEqual({ total: 100, take: 10, skip: 20 });
      expect(invoiceRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  // ============================================================
  // findAllSubscriptions
  // ============================================================

  describe('findAllSubscriptions', () => {
    it('debe retornar suscripciones con meta de paginación por defecto', async () => {
      jest
        .spyOn(subscriptionRepo, 'findAndCount')
        .mockResolvedValue([[mockSubscription], 1]);

      const result = await service.findAllSubscriptions();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, take: 50, skip: 0 });
      expect(subscriptionRepo.findAndCount).toHaveBeenCalledWith({
        relations: { organization: true, plan: true },
        order: { current_period_start: 'DESC' },
        take: 50,
        skip: 0,
      });
    });

    it('debe aplicar take y skip personalizados', async () => {
      jest
        .spyOn(subscriptionRepo, 'findAndCount')
        .mockResolvedValue([[mockSubscription], 25]);

      const result = await service.findAllSubscriptions(10, 5);

      expect(result.meta).toEqual({ total: 25, take: 10, skip: 5 });
      expect(subscriptionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 5 }),
      );
    });
  });

  // ============================================================
  // createInvoice
  // ============================================================

  describe('createInvoice', () => {
    it('debe crear una factura con estado DRAFT por defecto', async () => {
      jest.spyOn(invoiceRepo, 'create').mockReturnValue(mockInvoice);
      jest.spyOn(invoiceRepo, 'save').mockResolvedValue(mockInvoice);
      jest.spyOn(invoiceRepo, 'findOne').mockResolvedValue(mockInvoice);

      const result = await service.createInvoice({
        organization_id: mockOrgId,
        subscription_id: mockSubId,
        numero: 'INV-2025-001',
        monto_usd: 99.99,
        periodo_inicio: '2025-01-01',
        periodo_fin: '2025-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('inv-001');
      expect(invoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'DRAFT' }),
      );
    });

    it('debe crear una factura con estado personalizado', async () => {
      const paidInvoice = { ...mockInvoice, estado: InvoiceStatus.PAID };
      jest.spyOn(invoiceRepo, 'create').mockReturnValue(paidInvoice);
      jest.spyOn(invoiceRepo, 'save').mockResolvedValue(paidInvoice);
      jest.spyOn(invoiceRepo, 'findOne').mockResolvedValue(paidInvoice);

      const result = await service.createInvoice({
        organization_id: mockOrgId,
        subscription_id: mockSubId,
        numero: 'INV-2025-002',
        monto_usd: 99.99,
        periodo_inicio: '2025-02-01',
        periodo_fin: '2025-02-28',
        estado: InvoiceStatus.PAID,
      });

      expect(result.success).toBe(true);
      expect(invoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: InvoiceStatus.PAID }),
      );
    });
  });

  // ============================================================
  // findInvoicesByOrg
  // ============================================================

  describe('findInvoicesByOrg', () => {
    it('debe retornar facturas de la organización', async () => {
      jest.spyOn(invoiceRepo, 'find').mockResolvedValue([mockInvoice]);

      const result = await service.findInvoicesByOrg(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(invoiceRepo.find).toHaveBeenCalledWith({
        where: { organization_id: mockOrgId },
        order: { periodo_inicio: 'DESC' },
      });
    });

    it('debe retornar array vacío si no hay facturas', async () => {
      jest.spyOn(invoiceRepo, 'find').mockResolvedValue([]);

      const result = await service.findInvoicesByOrg('org-sin-facturas');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  // ============================================================
  // findUsageByOrg
  // ============================================================

  describe('findUsageByOrg', () => {
    it('debe combinar usage records con límites del plan', async () => {
      jest.spyOn(usageRepo, 'find').mockResolvedValue(mockUsageRecords);
      jest.spyOn(subscriptionRepo, 'findOne').mockResolvedValue(mockSubscription);

      const result = await service.findUsageByOrg(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // 3 plan limits

      // TERMINALES: usado=2, limite=5
      const terminales = result.data.find((r: any) => r.recurso === PlanResource.TERMINALES);
      expect(terminales?.usado).toBe(2);
      expect(terminales?.limite).toBe(5);

      // USUARIOS: usado=10, limite=20
      const usuarios = result.data.find((r: any) => r.recurso === PlanResource.USUARIOS);
      expect(usuarios?.usado).toBe(10);
      expect(usuarios?.limite).toBe(20);

      // ANDENES: usado=0 (no hay usage records), limite=10
      const andenes = result.data.find((r: any) => r.recurso === PlanResource.ANDENES);
      expect(andenes?.usado).toBe(0);
      expect(andenes?.limite).toBe(10);
    });

    it('debe retornar array vacío si no hay suscripción activa', async () => {
      jest.spyOn(usageRepo, 'find').mockResolvedValue([]);
      jest.spyOn(subscriptionRepo, 'findOne').mockResolvedValue(null);

      const result = await service.findUsageByOrg(mockOrgId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });
});
