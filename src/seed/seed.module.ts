import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anden } from '../entities/anden.entity';
import { Conductor } from '../entities/conductor.entity';
import { Despacho } from '../entities/despacho.entity';
import { Destino } from '../entities/destino.entity';
import { LineaTransporte } from '../entities/linea-transporte.entity';
import { Terminal } from '../entities/terminal.entity';
import { Unidad } from '../entities/unidad.entity';
import { Usuario } from '../entities/usuario.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Terminal,
      LineaTransporte,
      Unidad,
      Conductor,
      Anden,
      Destino,
      Usuario,
      Despacho,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
