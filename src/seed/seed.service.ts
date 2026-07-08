import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  EstadoAnden,
  EstadoDespacho,
  EstadoUnidad,
  Rol,
  TipoUnidad,
} from '../common/enums';
import { Anden } from '../entities/anden.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
import { Destino } from '../entities/destino.entity';
import { LineaTransporte } from '../entities/linea-transporte.entity';
import { Terminal } from '../entities/terminal.entity';
import { Unidad } from '../entities/unidad.entity';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Terminal) private readonly terminalRepo: Repository<Terminal>,
    @InjectRepository(LineaTransporte) private readonly lineaRepo: Repository<LineaTransporte>,
    @InjectRepository(Unidad) private readonly unidadRepo: Repository<Unidad>,
    @InjectRepository(Conductor) private readonly conductorRepo: Repository<Conductor>,
    @InjectRepository(Anden) private readonly andenRepo: Repository<Anden>,
    @InjectRepository(Destino) private readonly destinoRepo: Repository<Destino>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Despacho) private readonly despachoRepo: Repository<Despacho>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_ON_START !== 'true') return;

    // No ejecutar seed en producción
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('Seed ignorado en entorno de producción');
      return;
    }

    const count = await this.terminalRepo.count();
    if (count > 0) {
      this.logger.log('Base de datos ya tiene datos, omitiendo seed');
      return;
    }
    await this.seed();
    this.logger.log('Seed completado');
  }

  async seed() {
    const terminal = await this.terminalRepo.save({
      nombre: 'Terminal TermiBus Demo',
      direccion: 'Av. Principal, Sector Terminal',
      ciudad: 'Caracas',
    });

    const lineas = await this.lineaRepo.save([
      { nombre: 'Aeroexpresos Ejecutivos', telefono: '0212-555-1010', contacto: 'Carlos Mendoza', activo: true, terminal_id: terminal.id },
      { nombre: 'Expresos Occidente', telefono: '0212-555-2020', contacto: 'María Salazar', activo: true, terminal_id: terminal.id },
      { nombre: 'Transporte Los Llanos', telefono: '0212-555-3030', contacto: 'José Ramírez', activo: true, terminal_id: terminal.id },
    ]);

    const unidades = await this.unidadRepo.save([
      { placa: 'AB123CD', numero_interno: '101', capacidad: 45, tipo: TipoUnidad.BUS, linea_id: lineas[0].id, estado: EstadoUnidad.DISPONIBLE },
      { placa: 'IJ789KL', numero_interno: '201', capacidad: 24, tipo: TipoUnidad.MICROBUS, linea_id: lineas[1].id, estado: EstadoUnidad.DISPONIBLE },
      { placa: 'UV678WX', numero_interno: '302', capacidad: 15, tipo: TipoUnidad.VAN, linea_id: lineas[2].id, estado: EstadoUnidad.DISPONIBLE },
      { placa: 'YZ901AB', numero_interno: '103', capacidad: 45, tipo: TipoUnidad.BUS, linea_id: lineas[0].id, estado: EstadoUnidad.DISPONIBLE },
    ]);

    const conductores = await this.conductorRepo.save([
      { cedula: 'V-12345678', nombres: 'Juan Carlos', apellidos: 'Pérez Rivas', telefono: '0414-111-2233', licencia: '5A-2028', linea_id: lineas[0].id, activo: true },
      { cedula: 'V-34567890', nombres: 'Miguel Ángel', apellidos: 'Rodríguez León', telefono: '0424-333-4455', licencia: '5A-2029', linea_id: lineas[1].id, activo: true },
      { cedula: 'V-56789012', nombres: 'Rafael Ernesto', apellidos: 'Sánchez Blanco', telefono: '0416-555-6677', licencia: '5A-2030', linea_id: lineas[2].id, activo: true },
    ]);

    const andenes = await this.andenRepo.save(
      [1, 2, 3, 4, 5, 6].map((numero) => ({
        numero,
        descripcion: `Andén ${numero}`,
        estado: EstadoAnden.LIBRE,
        terminal_id: terminal.id,
      })),
    );

    const destinos = await this.destinoRepo.save([
      { nombre: 'Caracas - Centro', ruta: 'Vía autopista regional', duracion_estimada_min: 90, activo: true },
      { nombre: 'Maracay', ruta: 'Vía Turmero', duracion_estimada_min: 120, activo: true },
      { nombre: 'Valencia', ruta: 'Vía Maracay', duracion_estimada_min: 180, activo: true },
      { nombre: 'Barquisimeto', ruta: 'Vía Yaracuy', duracion_estimada_min: 300, activo: true },
    ]);

    const hash = await bcrypt.hash('termibus123', 10);
    await this.usuarioRepo.save([
      { username: 'admin', password_hash: hash, rol: Rol.ADMIN, nombre_completo: 'Administrador Terminal', terminal_id: terminal.id, activo: true, conductor_id: null },
      { username: 'despachador', password_hash: hash, rol: Rol.DESPACHADOR, nombre_completo: 'Rosa Villegas', terminal_id: terminal.id, activo: true, conductor_id: null },
      { username: 'conductor', password_hash: hash, rol: Rol.CONDUCTOR, nombre_completo: 'Juan Carlos Pérez Rivas', terminal_id: terminal.id, activo: true, conductor_id: conductores[0].id },
    ]);

    const now = new Date();
    await this.despachoRepo.save([
      {
        unidad_id: unidades[0].id,
        conductor_id: conductores[0].id,
        anden_id: andenes[0].id,
        destino_id: destinos[0].id,
        terminal_id: terminal.id,
        hora_programada: '14:30',
        hora_asignacion: new Date(now.getTime() - 8 * 60000),
        estado: EstadoDespacho.EN_ANDEN,
        prioridad: 0,
        creado_en: new Date(now.getTime() - 20 * 60000),
      },
      {
        unidad_id: unidades[1].id,
        conductor_id: conductores[1].id,
        anden_id: andenes[2].id,
        destino_id: destinos[1].id,
        terminal_id: terminal.id,
        hora_programada: '14:45',
        hora_asignacion: new Date(now.getTime() - 3 * 60000),
        estado: EstadoDespacho.ASIGNADO,
        prioridad: 0,
        creado_en: new Date(now.getTime() - 15 * 60000),
      },
      {
        unidad_id: unidades[3].id,
        conductor_id: conductores[0].id,
        destino_id: destinos[2].id,
        terminal_id: terminal.id,
        hora_programada: '15:00',
        estado: EstadoDespacho.EN_COLA,
        prioridad: 0,
        creado_en: new Date(now.getTime() - 5 * 60000),
      },
    ]);

    await this.andenRepo.update(andenes[0].id, { estado: EstadoAnden.OCUPADO });
    await this.andenRepo.update(andenes[2].id, { estado: EstadoAnden.OCUPADO });
  }
}
