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
import { Conductor } from '../entities/conductor.entity';
import { CreateConductorDto } from './dto/create-conductor.dto';
import { UpdateConductorDto } from './dto/update-conductor.dto';

@Controller('conductores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class ConductoresController {
  private readonly crud: CrudService<Conductor>;

  constructor(@InjectRepository(Conductor) repo: Repository<Conductor>) {
    this.crud = new CrudService(repo);
  }

  @Get() findAll() {
    return this.crud.findAll();
  }

  @Post() create(@Body() dto: CreateConductorDto) {
    return this.crud.create(dto);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateConductorDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
