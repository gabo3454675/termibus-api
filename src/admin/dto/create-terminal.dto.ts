import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTerminalDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pago_movil_banco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pago_movil_telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pago_movil_cedula_rif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pago_movil_titular?: string;
}

export class UpdateTerminalDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pago_movil_banco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pago_movil_telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pago_movil_cedula_rif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pago_movil_titular?: string;
}
