import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MetodoPago } from '../../common/enums';

/** Cierra el cobro de un abordaje que quedó PENDIENTE (p. ej. Pago Móvil tras abordar) */
export class CobrarAbordajeDto {
  @IsEnum(MetodoPago)
  metodo_pago: MetodoPago;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referencia?: string;
}
