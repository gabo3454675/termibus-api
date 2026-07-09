import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EscanearAbordajeDto {
  /** Contenido crudo del QR (JSON o token UUID) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  qr: string;
}
