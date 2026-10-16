import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MetodoPago } from '../../common/enums';

/**
 * Registro manual de abordaje para pasajeros sin app / sin identidad.
 * El conductor/cobrador solo toca "+1" y cobra.
 */
export class AbordajeManualDto {
  /** Cantidad de pasajeros anónimos a registrar (default 1) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cantidad?: number;

  /** Cédula opcional — si viene, se asocia/identifica al pasajero */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cedula?: string;

  @IsOptional()
  @IsEnum(MetodoPago)
  metodo_pago?: MetodoPago;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referencia?: string;
}
