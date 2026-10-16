import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConductorTurnoService } from './conductor-turno.service';
import { EscanearAbordajeDto } from './dto/escanear-abordaje.dto';
import { AbordajeManualDto } from './dto/abordaje-manual.dto';
import { CobrarAbordajeDto } from './dto/cobrar-abordaje.dto';
import { IngresarConductorDto } from './dto/ingresar-conductor.dto';
import { PublicService } from './public.service';
import { RecuperarPasajeroDto } from './dto/recuperar-pasajero.dto';
import { RegistroPasajeroDto } from './dto/registro-pasajero.dto';

/**
 * Endpoints públicos — sin JWT de staff.
 * Pasajeros: salidas y registro único.
 * Conductores: ingreso por cédula y escaneo de abordaje.
 */
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly conductorTurno: ConductorTurnoService,
  ) {}

  @Get('salidas')
  @SkipThrottle()
  getSalidas(@Query('terminal') terminalId?: string) {
    return this.publicService.getSalidas(terminalId);
  }

  @Post('pasajeros/registro')
  registrar(@Body() dto: RegistroPasajeroDto) {
    return this.publicService.registrar(dto);
  }

  @Post('pasajeros/recuperar')
  recuperar(@Body() dto: RecuperarPasajeroDto) {
    return this.publicService.recuperar(dto);
  }

  @Get('pasajeros/me')
  @SkipThrottle()
  perfilPasajero(@Headers('x-pasajero-token') token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta el token de pasajero');
    }
    return this.publicService.perfilPorToken(token.trim());
  }

  @Get('pasajeros/mis-viajes')
  @SkipThrottle()
  misViajes(@Headers('x-pasajero-token') token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta el token de pasajero');
    }
    return this.publicService.misViajes(token.trim());
  }

  // ─── Conductor (sin contraseña) ─────────────────────────────

  @Post('conductor/ingresar')
  ingresarConductor(@Body() dto: IngresarConductorDto) {
    return this.conductorTurno.ingresar(dto.cedula);
  }

  @Get('conductor/turno')
  @SkipThrottle()
  turnoConductor(@Headers('x-conductor-session') token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.obtenerTurno(token.trim());
  }

  @Post('conductor/confirmar')
  confirmarConductor(@Headers('x-conductor-session') token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.confirmarLlegada(token.trim());
  }

  @Post('conductor/escanear')
  escanearConductor(
    @Headers('x-conductor-session') token: string | undefined,
    @Body() dto: EscanearAbordajeDto,
  ) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.escanear(token.trim(), dto.qr, {
      metodo_pago: dto.metodo_pago,
      monto: dto.monto,
      referencia: dto.referencia,
    });
  }

  @Post('conductor/abordaje-manual')
  abordajeManual(
    @Headers('x-conductor-session') token: string | undefined,
    @Body() dto: AbordajeManualDto,
  ) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.abordajeManual(token.trim(), dto);
  }

  @Post('conductor/cobrar/:id')
  cobrar(
    @Headers('x-conductor-session') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: CobrarAbordajeDto,
  ) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.cobrar(token.trim(), id, dto);
  }

  @Post('conductor/cerrar-turno')
  cerrarTurno(
    @Headers('x-conductor-session') token: string | undefined,
    @Body('notas') notas?: string,
  ) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.cerrarTurno(token.trim(), notas);
  }

  @Get('conductor/abordajes')
  @SkipThrottle()
  abordajesConductor(@Headers('x-conductor-session') token?: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('Falta la sesión de conductor');
    }
    return this.conductorTurno.listarAbordajes(token.trim());
  }
}
