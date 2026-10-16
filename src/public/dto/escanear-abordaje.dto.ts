import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MetodoPago } from '../../common/enums';

export class EscanearAbordajeDto {
  /** Contenido crudo del QR (JSON o token UUID) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  qr: string;

  /** Método de pago con el que se cobra el pasaje (opcional → queda PENDIENTE) */
  @IsOptional()
  @IsEnum(MetodoPago)
  metodo_pago?: MetodoPago;

  /** Monto cobrado — si se omite se usa la tarifa efectiva del despacho */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;

  /** Referencia del Pago Móvil / transferencia / punto de venta */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  referencia?: string;
}
