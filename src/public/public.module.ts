import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abordaje } from '../entities/abordaje.entity';
import { CierreTurno } from '../entities/cierre-turno.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
import { Organization } from '../entities/tenant/organization.entity';
import { Pasajero } from '../entities/pasajero.entity';
import { SesionConductor } from '../entities/sesion-conductor.entity';
import { DespachosModule } from '../despachos/despachos.module';
import { ConductorTurnoService } from './conductor-turno.service';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pasajero,
      Despacho,
      Abordaje,
      Conductor,
      SesionConductor,
      CierreTurno,
      Organization,
    ]),
    DespachosModule,
  ],
  controllers: [PublicController],
  providers: [PublicService, ConductorTurnoService],
  exports: [PublicService, ConductorTurnoService],
})
export class PublicModule {}
