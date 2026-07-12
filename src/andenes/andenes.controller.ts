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
import { Rol, EstadoDespacho } from '../common/enums';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/guards';
import { CrudService } from '../common/crud.service';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { DESPACHO_RELATIONS } from '../common/relations';
import { CreateAndenDto } from './dto/create-anden.dto';
import { UpdateAndenDto } from './dto/update-anden.dto';

@Controller('andenes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AndenesController {
  private readonly crud: CrudService<Anden>;

  constructor(
    @InjectRepository(Anden) private readonly repo: Repository<Anden>,
    @InjectRepository(Despacho) private readonly despachoRepo: Repository<Despacho>,
  ) {
    this.crud = new CrudService(this.repo);
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  async findAll(@CurrentUser() user: { terminal_id: string; orgId: string }) {
    const andenes = await this.repo.find({
      where: { terminal_id: user.terminal_id, organization_id: user.orgId } as never,
      order: { numero: 'ASC' } as never,
    });

    const activos = await this.despachoRepo.find({
      where: [
        { terminal_id: user.terminal_id, estado: EstadoDespacho.ASIGNADO },
        { terminal_id: user.terminal_id, estado: EstadoDespacho.EN_ANDEN },
      ],
      relations: DESPACHO_RELATIONS,
    });

    return andenes
      .sort((a, b) => a.numero - b.numero)
      .map((anden) => {
        const despacho = activos.find((d) => d.anden_id === anden.id);
        return {
          ...anden,
          despacho_actual: despacho
            ? {
                id: despacho.id,
                unidad: { placa: despacho.unidad.placa, tipo: despacho.unidad.tipo },
                conductor: {
                  nombres: despacho.conductor.nombres,
                  apellidos: despacho.conductor.apellidos,
                  cedula: despacho.conductor.cedula,
                },
                destino: { nombre: despacho.destino.nombre },
                linea: despacho.unidad.linea
                  ? { nombre: despacho.unidad.linea.nombre }
                  : undefined,
                hora_programada: despacho.hora_programada,
                hora_asignacion: despacho.hora_asignacion?.toISOString() ?? null,
                estado: despacho.estado,
              }
            : null,
        };
      });
  }

  @Post()
  @Roles(Rol.ADMIN)
  create(@Body() dto: CreateAndenDto) {
    return this.crud.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateAndenDto) {
    return this.crud.update(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  remove(@Param('id') id: string) {
    return this.crud.remove(id);
  }
}
