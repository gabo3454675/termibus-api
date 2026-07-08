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
import { Destino } from '../entities/destino.entity';
import { CreateDestinoDto } from './dto/create-destino.dto';
import { UpdateDestinoDto } from './dto/update-destino.dto';

@Controller('destinos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class DestinosController {
  private readonly crud: CrudService<Destino>;

  constructor(@InjectRepository(Destino) repo: Repository<Destino>) {
    this.crud = new CrudService(repo);
  }

  @Get() findAll() {
    return this.crud.findAll();
  }

  @Post() create(@Body() dto: CreateDestinoDto) {
    return this.crud.create(dto);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDestinoDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
