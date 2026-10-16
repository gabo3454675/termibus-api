import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abordaje } from '../entities/abordaje.entity';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, Anden, Abordaje])],
  controllers: [ReportesController],
})
export class ReportesModule {}
