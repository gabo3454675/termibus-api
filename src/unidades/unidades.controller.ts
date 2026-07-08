import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/guards';
import { CrudService } from '../common/crud.service';
import { Unidad } from '../entities/unidad.entity';
import { CreateUnidadDto } from './dto/create-unidad.dto';
import { UpdateUnidadDto } from './dto/update-unidad.dto';

@Controller('unidades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class UnidadesController {
  private readonly crud: CrudService<Unidad>;

  constructor(@InjectRepository(Unidad) repo: Repository<Unidad>) {
    this.crud = new CrudService(repo);
  }

  @Get() findAll() {
    return this.crud.findAll();
  }

  @Post() create(@Body() dto: CreateUnidadDto) {
    return this.crud.create(dto);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUnidadDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
