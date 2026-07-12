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

  @Get() findAll(@CurrentUser() user: { orgId: string }) {
    return this.crud.findAll({ organization_id: user.orgId } as never);
  }

  @Post() create(@Body() dto: CreateConductorDto, @CurrentUser() user: { orgId: string }) {
    return this.crud.create({ ...dto, organization_id: user.orgId } as never);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateConductorDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
