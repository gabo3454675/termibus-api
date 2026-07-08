import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineaTransporte } from '../entities/linea-transporte.entity';
import { LineasController } from './lineas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LineaTransporte])],
  controllers: [LineasController],
})
export class LineasModule {}
