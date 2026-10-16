import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  /** Tarifa del pasaje (default por destino) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifa?: number;

  @IsOptional()
  @IsString()
  @IsIn(['VES', 'USD'])
  moneda?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
