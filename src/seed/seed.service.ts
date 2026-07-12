import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  BillingPeriod,
  EstadoAnden,
  EstadoDespacho,
  EstadoUnidad,
  OrganizationRole,
  PlanCode,
  PlanResource,
  SubscriptionStatus,
  TerminalRole,
  TipoUnidad,
} from '../common/enums';
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

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(TerminalAssignment)
    private readonly assignmentRepo: Repository<TerminalAssignment>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanLimit)
    private readonly planLimitRepo: Repository<PlanLimit>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(LineaTransporte)
    private readonly lineaRepo: Repository<LineaTransporte>,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
    @InjectRepository(Conductor)
    private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Destino)
    private readonly destinoRepo: Repository<Destino>,
    @InjectRepository(Anden)
    private readonly andenRepo: Repository<Anden>,
    @InjectRepository(Despacho)
    private readonly despachoRepo: Repository<Despacho>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_ON_START !== 'true') return;

    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('Seed ignorado en entorno de producción');
      return;
    }

    const existingOrg = await this.organizationRepo.findOne({
      where: { slug: 'termibus-demo' },
    });
    if (existingOrg) {
      this.logger.log(
        'Organización demo ya existe, omitiendo seed',
      );
      return;
    }

    await this.seed();
    this.logger.log('Seed completado');
  }

  async seed() {
    // ── 1. Plan FREE ──────────────────────────────────────────────
    const freePlan = await this.planRepo.save({
      codigo: PlanCode.FREE,
      nombre: 'Free',
      precio_mensual_usd: 0,
      precio_anual_usd: 0,
      activo: true,
      orden: 1,
    });

    await this.planLimitRepo.save([
      { plan_id: freePlan.id, recurso: PlanResource.TERMINALES, limite: 1 },
      { plan_id: freePlan.id, recurso: PlanResource.USUARIOS, limite: 3 },
      { plan_id: freePlan.id, recurso: PlanResource.ANDENES, limite: 6 },
      { plan_id: freePlan.id, recurso: PlanResource.DESPACHOS_MES, limite: 100 },
      { plan_id: freePlan.id, recurso: PlanResource.LINEAS, limite: 3 },
      { plan_id: freePlan.id, recurso: PlanResource.UNIDADES, limite: 5 },
    ]);

    // ── 2. Organization ──────────────────────────────────────────
    const org = await this.organizationRepo.save({
      nombre: 'Cooperativa TermiBus Demo',
      slug: 'termibus-demo',
      email_contacto: 'admin@termibus-demo.com',
      telefono: '0212-555-0000',
      pais: 'Venezuela',
      timezone: 'America/Caracas',
      activo: true,
    });

    // ── 3. Subscription ──────────────────────────────────────────
    await this.subscriptionRepo.save({
      organization_id: org.id,
      plan_id: freePlan.id,
      estado: SubscriptionStatus.ACTIVE,
      periodo: BillingPeriod.MONTHLY,
      trial_ends_at: null,
      current_period_start: new Date(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ),
    });

    // ── 4. Terminales ────────────────────────────────────────────
    const terminalNorte = await this.terminalRepo.save({
      organization_id: org.id,
      nombre: 'Terminal Norte',
      slug: 'norte',
      direccion: 'Av. Principal, Sector Terminal Norte',
      ciudad: 'Caracas',
      activo: true,
    });

    const terminalSur = await this.terminalRepo.save({
      organization_id: org.id,
      nombre: 'Terminal Sur',
      slug: 'sur',
      direccion: 'Av. Libertador, Sector Terminal Sur',
      ciudad: 'Caracas',
      activo: true,
    });

    // ── 5. Users ─────────────────────────────────────────────────
    const hash = await bcrypt.hash('termibus123', 10);

    const userOwner = await this.userRepo.save({
      email: 'owner@termibus-demo.com',
      password_hash: hash,
      nombre_completo: 'Administrador Terminal',
      activo: true,
      is_platform_admin: false,
      conductor_id: null,
    });

    const userAdmin = await this.userRepo.save({
      email: 'admin@termibus-demo.com',
      password_hash: hash,
      nombre_completo: 'Rosa Villegas',
      activo: true,
      is_platform_admin: false,
      conductor_id: null,
    });

    const userDespachadorNorte = await this.userRepo.save({
      email: 'despachador.norte@termibus-demo.com',
      password_hash: hash,
      nombre_completo: 'Despachador Terminal Norte',
      activo: true,
      is_platform_admin: false,
      conductor_id: null,
    });

    const userDespachadorSur = await this.userRepo.save({
      email: 'despachador.sur@termibus-demo.com',
      password_hash: hash,
      nombre_completo: 'Despachador Terminal Sur',
      activo: true,
      is_platform_admin: false,
      conductor_id: null,
    });

    // ── 6. Organization Members ──────────────────────────────────
    const memberOwner = await this.memberRepo.save({
      organization_id: org.id,
      user_id: userOwner.id,
      rol: OrganizationRole.OWNER,
      activo: true,
    });

    const memberAdmin = await this.memberRepo.save({
      organization_id: org.id,
      user_id: userAdmin.id,
      rol: OrganizationRole.ADMIN,
      activo: true,
    });

    const memberDespachadorNorte = await this.memberRepo.save({
      organization_id: org.id,
      user_id: userDespachadorNorte.id,
      rol: OrganizationRole.MEMBER,
      activo: true,
    });

    const memberDespachadorSur = await this.memberRepo.save({
      organization_id: org.id,
      user_id: userDespachadorSur.id,
      rol: OrganizationRole.MEMBER,
      activo: true,
    });

    // ── 7. Terminal Assignments ──────────────────────────────────
    await this.assignmentRepo.save([
      {
        organization_member_id: memberDespachadorNorte.id,
        terminal_id: terminalNorte.id,
        rol: TerminalRole.DESPACHADOR,
        activo: true,
      },
      {
        organization_member_id: memberDespachadorSur.id,
        terminal_id: terminalSur.id,
        rol: TerminalRole.DESPACHADOR,
        activo: true,
      },
    ]);

    // ── 8. Líneas (split across terminals) ───────────────────────
    const lineas = await this.lineaRepo.save([
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        nombre: 'Aeroexpresos Ejecutivos',
        telefono: '0212-555-1010',
        contacto: 'Carlos Mendoza',
        activo: true,
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        nombre: 'Expresos Occidente',
        telefono: '0212-555-2020',
        contacto: 'María Salazar',
        activo: true,
      },
      {
        organization_id: org.id,
        terminal_id: terminalSur.id,
        nombre: 'Transporte Los Llanos',
        telefono: '0212-555-3030',
        contacto: 'José Ramírez',
        activo: true,
      },
      {
        organization_id: org.id,
        terminal_id: terminalSur.id,
        nombre: 'Rutas del Sur',
        telefono: '0212-555-4040',
        contacto: 'Ana Pérez',
        activo: false,
      },
    ]);

    // ── 9. Unidades (aligned with mock-data.ts) ──────────────────
    const unidades = await this.unidadRepo.save([
      {
        organization_id: org.id,
        placa: 'AB123CD',
        numero_interno: '101',
        capacidad: 45,
        tipo: TipoUnidad.BUS,
        linea_id: lineas[0].id,
        estado: EstadoUnidad.DISPONIBLE,
      },
      {
        organization_id: org.id,
        placa: 'EF456GH',
        numero_interno: '102',
        capacidad: 45,
        tipo: TipoUnidad.BUS,
        linea_id: lineas[0].id,
        estado: EstadoUnidad.EN_RUTA,
      },
      {
        organization_id: org.id,
        placa: 'IJ789KL',
        numero_interno: '201',
        capacidad: 24,
        tipo: TipoUnidad.MICROBUS,
        linea_id: lineas[1].id,
        estado: EstadoUnidad.DISPONIBLE,
      },
      {
        organization_id: org.id,
        placa: 'MN012OP',
        numero_interno: '202',
        capacidad: 24,
        tipo: TipoUnidad.MICROBUS,
        linea_id: lineas[1].id,
        estado: EstadoUnidad.DISPONIBLE,
      },
      {
        organization_id: org.id,
        placa: 'QR345ST',
        numero_interno: '301',
        capacidad: 15,
        tipo: TipoUnidad.VAN,
        linea_id: lineas[2].id,
        estado: EstadoUnidad.EN_MANTENIMIENTO,
      },
      {
        organization_id: org.id,
        placa: 'UV678WX',
        numero_interno: '302',
        capacidad: 15,
        tipo: TipoUnidad.VAN,
        linea_id: lineas[2].id,
        estado: EstadoUnidad.DISPONIBLE,
      },
      {
        organization_id: org.id,
        placa: 'YZ901AB',
        numero_interno: '103',
        capacidad: 45,
        tipo: TipoUnidad.BUS,
        linea_id: lineas[0].id,
        estado: EstadoUnidad.DISPONIBLE,
      },
    ]);

    // ── 10. Conductores (aligned with mock-data.ts) ──────────────
    const conductores = await this.conductorRepo.save([
      {
        organization_id: org.id,
        cedula: 'V-12345678',
        nombres: 'Juan Carlos',
        apellidos: 'Pérez Rivas',
        telefono: '0414-111-2233',
        licencia: '5A-2028',
        linea_id: lineas[0].id,
        activo: true,
      },
      {
        organization_id: org.id,
        cedula: 'V-23456789',
        nombres: 'Luis Alberto',
        apellidos: 'González Silva',
        telefono: '0414-222-3344',
        licencia: '5A-2027',
        linea_id: lineas[0].id,
        activo: true,
      },
      {
        organization_id: org.id,
        cedula: 'V-34567890',
        nombres: 'Miguel Ángel',
        apellidos: 'Rodríguez León',
        telefono: '0424-333-4455',
        licencia: '5A-2029',
        linea_id: lineas[1].id,
        activo: true,
      },
      {
        organization_id: org.id,
        cedula: 'V-45678901',
        nombres: 'Pedro José',
        apellidos: 'Martínez Ruiz',
        telefono: '0424-444-5566',
        licencia: '5A-2028',
        linea_id: lineas[1].id,
        activo: true,
      },
      {
        organization_id: org.id,
        cedula: 'V-56789012',
        nombres: 'Rafael Ernesto',
        apellidos: 'Sánchez Blanco',
        telefono: '0416-555-6677',
        licencia: '5A-2030',
        linea_id: lineas[2].id,
        activo: true,
      },
      {
        organization_id: org.id,
        cedula: 'V-67890123',
        nombres: 'Andrés Felipe',
        apellidos: 'Torres Moreno',
        telefono: '0416-666-7788',
        licencia: '5A-2028',
        linea_id: lineas[2].id,
        activo: false,
      },
    ]);

    // ── Link conductor user to first conductor ─────────────────
    const userConductor = await this.userRepo.save({
      email: 'conductor@termibus-demo.com',
      password_hash: hash,
      nombre_completo: 'Juan Carlos Pérez Rivas',
      activo: true,
      is_platform_admin: false,
      conductor_id: conductores[0].id,
    });

    await this.memberRepo.save({
      organization_id: org.id,
      user_id: userConductor.id,
      rol: OrganizationRole.MEMBER,
      activo: true,
    });

    // ── 11. Destinos (shared across org, aligned with mock) ──────
    const destinos = await this.destinoRepo.save([
      {
        organization_id: org.id,
        nombre: 'Caracas - Centro',
        ruta: 'Vía autopista regional',
        duracion_estimada_min: 90,
        activo: true,
      },
      {
        organization_id: org.id,
        nombre: 'Maracay',
        ruta: 'Vía Turmero',
        duracion_estimada_min: 120,
        activo: true,
      },
      {
        organization_id: org.id,
        nombre: 'Valencia',
        ruta: 'Vía Maracay',
        duracion_estimada_min: 180,
        activo: true,
      },
      {
        organization_id: org.id,
        nombre: 'Barquisimeto',
        ruta: 'Vía Yaracuy',
        duracion_estimada_min: 300,
        activo: true,
      },
      {
        organization_id: org.id,
        nombre: 'Puerto La Cruz',
        ruta: 'Vía Barcelona',
        duracion_estimada_min: 360,
        activo: true,
      },
      {
        organization_id: org.id,
        nombre: 'Maracaibo',
        ruta: 'Vía Coro',
        duracion_estimada_min: 540,
        activo: false,
      },
    ]);

    // ── 12. Andenes (6 per terminal, matching mock states) ─────
    const andenesNorte = await this.andenRepo.save(
      [1, 2, 3, 4, 5, 6].map((numero) => {
        let estado = EstadoAnden.LIBRE;
        let descripcion = `Andén ${numero}`;
        if (numero === 1) {
          estado = EstadoAnden.OCUPADO;
          descripcion = 'Andén principal norte';
        } else if (numero === 3) {
          estado = EstadoAnden.OCUPADO;
          descripcion = 'Andén expresos';
        } else if (numero === 4) {
          descripcion = 'Andén microbuses';
        } else if (numero === 5) {
          descripcion = 'Andén largo recorrido';
        } else if (numero === 6) {
          descripcion = 'Andén VAN';
        }
        return {
          organization_id: org.id,
          terminal_id: terminalNorte.id,
          numero,
          descripcion,
          estado,
        };
      }),
    );

    await this.andenRepo.save(
      [7, 8, 9, 10, 11, 12].map((numero) => ({
        organization_id: org.id,
        terminal_id: terminalSur.id,
        numero,
        descripcion:
          numero === 7
            ? 'Andén sur'
            : numero === 8
              ? 'Andén auxiliar'
              : `Andén ${numero}`,
        estado:
          numero === 7
            ? EstadoAnden.FUERA_SERVICIO
            : EstadoAnden.LIBRE,
      })),
    );

    // ── 13. Despachos (on Terminal Norte, matching mock states) ──
    const now = new Date();

    await this.despachoRepo.save([
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[0].id,
        conductor_id: conductores[0].id,
        anden_id: andenesNorte[0].id,
        destino_id: destinos[0].id,
        hora_programada: '14:30',
        hora_asignacion: new Date(now.getTime() - 8 * 60000),
        estado: EstadoDespacho.EN_ANDEN,
        prioridad: 1,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 20 * 60000),
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[2].id,
        conductor_id: conductores[2].id,
        anden_id: andenesNorte[2].id,
        destino_id: destinos[1].id,
        hora_programada: '14:45',
        hora_asignacion: new Date(now.getTime() - 3 * 60000),
        estado: EstadoDespacho.ASIGNADO,
        prioridad: 2,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 15 * 60000),
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[3].id,
        conductor_id: conductores[3].id,
        anden_id: null,
        destino_id: destinos[2].id,
        hora_programada: '15:00',
        hora_asignacion: null,
        estado: EstadoDespacho.EN_COLA,
        prioridad: 3,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 12 * 60000),
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[5].id,
        conductor_id: conductores[4].id,
        anden_id: null,
        destino_id: destinos[3].id,
        hora_programada: '15:15',
        hora_asignacion: null,
        estado: EstadoDespacho.EN_COLA,
        prioridad: 4,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 9 * 60000),
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[6].id,
        conductor_id: conductores[1].id,
        anden_id: null,
        destino_id: destinos[4].id,
        hora_programada: '15:30',
        hora_asignacion: null,
        estado: EstadoDespacho.EN_COLA,
        prioridad: 5,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 4 * 60000),
      },
      {
        organization_id: org.id,
        terminal_id: terminalNorte.id,
        unidad_id: unidades[1].id,
        conductor_id: conductores[1].id,
        anden_id: andenesNorte[4].id,
        destino_id: destinos[1].id,
        hora_programada: '13:30',
        hora_asignacion: new Date(now.getTime() - 70 * 60000),
        hora_salida: new Date(now.getTime() - 45 * 60000),
        estado: EstadoDespacho.DESPACHADO,
        prioridad: 1,
        creado_por: userAdmin.id,
        creado_en: new Date(now.getTime() - 90 * 60000),
      },
    ]);
  }
}
