import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Despacho } from '../entities/despacho.entity';
import { TableroController } from './tablero.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho])],
  controllers: [TableroController],
})
export class TableroModule {}
