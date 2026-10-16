import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abordaje } from '../entities/abordaje.entity';
import { Despacho } from '../entities/despacho.entity';
import { TableroController } from './tablero.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, Abordaje])],
  controllers: [TableroController],
})
export class TableroModule {}
