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

  @Get() findAll(@CurrentUser() user: { orgId: string }) {
    return this.crud.findAll({ organization_id: user.orgId } as never);
  }

  @Post() create(@Body() dto: CreateUnidadDto, @CurrentUser() user: { orgId: string }) {
    return this.crud.create({ ...dto, organization_id: user.orgId } as never);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUnidadDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
