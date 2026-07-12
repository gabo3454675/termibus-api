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
import { CurrentUser } from '../common/decorators';
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

  @Get() findAll(@CurrentUser() user: { orgId: string }) {
    return this.crud.findAll({ organization_id: user.orgId } as never);
  }

  @Post() create(@Body() dto: CreateLineaDto, @CurrentUser() user: { orgId: string }) {
    return this.crud.create({ ...dto, organization_id: user.orgId } as never);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateLineaDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
