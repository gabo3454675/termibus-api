import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destino } from '../entities/destino.entity';
import { DestinosController } from './destinos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Destino])],
  controllers: [DestinosController],
})
export class DestinosModule {}
