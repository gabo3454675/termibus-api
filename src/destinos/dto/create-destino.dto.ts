import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDestinoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  ruta?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracion_estimada_min?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
