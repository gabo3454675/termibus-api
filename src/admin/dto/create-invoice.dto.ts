import { IsUUID, IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @IsUUID()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsNumber()
  @Min(0)
  monto_usd: number;

  @IsString()
  @IsNotEmpty()
  periodo_inicio: string;

  @IsString()
  @IsNotEmpty()
  periodo_fin: string;

  @IsString()
  @IsOptional()
  estado?: string;
}