import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { AndenesController } from './andenes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Anden, Despacho])],
  controllers: [AndenesController],
})
export class AndenesModule {}
