import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { EstadoUnidad, TipoUnidad } from '../../common/enums';

export class CreateUnidadDto {
  @IsString()
  @IsNotEmpty()
  placa: string;

  @IsString()
  @IsNotEmpty()
  numero_interno: string;

  @IsInt()
  @Min(1)
  capacidad: number;

  @IsOptional()
  @IsEnum(TipoUnidad)
  tipo?: TipoUnidad;

  @IsOptional()
  @IsEnum(EstadoUnidad)
  estado?: EstadoUnidad;

  @IsUUID()
  linea_id: string;
}
