import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, Anden])],
  controllers: [ReportesController],
})
export class ReportesModule {}
