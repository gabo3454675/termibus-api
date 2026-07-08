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
import { LineaTransporte } from '../entities/linea-transporte.entity';
import { CreateLineaDto } from './dto/create-linea.dto';
import { UpdateLineaDto } from './dto/update-linea.dto';

@Controller('lineas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class LineasController {
  private readonly crud: CrudService<LineaTransporte>;

  constructor(
    @InjectRepository(LineaTransporte)
    repo: Repository<LineaTransporte>,
  ) {
    this.crud = new CrudService(repo);
  }

  @Get() findAll() {
    return this.crud.findAll();
  }

  @Post() create(@Body() dto: CreateLineaDto) {
    return this.crud.create(dto);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateLineaDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
