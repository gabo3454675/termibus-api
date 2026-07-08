import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Rol, EstadoDespacho } from '../common/enums';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/guards';
import { DespachosService } from './despachos.service';

class CreateDespachoDto {
  @IsUUID()
  unidad_id: string;

  @IsUUID()
  conductor_id: string;

  @IsUUID()
  destino_id: string;

  @IsOptional()
  @IsString()
  hora_programada?: string;
}

class AsignarDto {
  @IsUUID()
  anden_id: string;
}

@Controller('despachos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DespachosController {
  constructor(private readonly despachosService: DespachosService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  findAll(
    @CurrentUser() user: { terminal_id: string },
    @Query('estado') estado?: EstadoDespacho,
  ) {
    return this.despachosService.findAll(user.terminal_id, estado);
  }

  @Get('mi-turno')
  @Roles(Rol.CONDUCTOR)
  miTurno(@CurrentUser() user: { conductor_id: string }) {
    return this.despachosService.findForConductor(user.conductor_id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  create(
    @CurrentUser() user: { terminal_id: string; id: string },
    @Body() dto: CreateDespachoDto,
  ) {
    return this.despachosService.create(user.terminal_id, dto, user.id);
  }

  @Post('auto-asignar')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  autoAsignar(@CurrentUser() user: { terminal_id: string }) {
    return this.despachosService.asignarAndenesLibres(user.terminal_id);
  }

  @Patch(':id/asignar')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  asignar(
    @Param('id') id: string,
    @CurrentUser() user: { terminal_id: string },
    @Body() dto: AsignarDto,
  ) {
    return this.despachosService.asignarManual(id, dto.anden_id, user.terminal_id);
  }

  @Patch(':id/despachar')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  despachar(@Param('id') id: string, @CurrentUser() user: { terminal_id: string }) {
    return this.despachosService.despachar(id, user.terminal_id);
  }

  @Patch(':id/cancelar')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  cancelar(@Param('id') id: string, @CurrentUser() user: { terminal_id: string }) {
    return this.despachosService.cancelar(id, user.terminal_id);
  }

  @Patch(':id/confirmar')
  @Roles(Rol.CONDUCTOR)
  confirmar(
    @Param('id') id: string,
    @CurrentUser() user: { conductor_id: string },
  ) {
    return this.despachosService.confirmarLlegada(id, user.conductor_id);
  }

  @Get(':id/historial')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  getHistorial(@Param('id') id: string) {
    return this.despachosService.getHistorial(id);
  }
}
