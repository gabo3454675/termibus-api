import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abordaje } from '../entities/abordaje.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
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
    ]),
    DespachosModule,
  ],
  controllers: [PublicController],
  providers: [PublicService, ConductorTurnoService],
  exports: [PublicService, ConductorTurnoService],
})
export class PublicModule {}
