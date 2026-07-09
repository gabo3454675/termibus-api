import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistroPasajeroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombres: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos: string;

  /** data:image/jpeg;base64,... — opcional al recuperar perfil existente */
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  foto_url?: string;
}
