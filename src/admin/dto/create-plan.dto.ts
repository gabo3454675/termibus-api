import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { PlanCode, PlanResource } from '../../common/enums';

export class CreatePlanDto {
  @IsEnum(PlanCode)
  @IsNotEmpty()
  codigo: PlanCode;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  @IsOptional()
  precio_mensual_usd?: number;

  @IsNumber()
  @IsOptional()
  precio_anual_usd?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsNumber()
  @IsOptional()
  orden?: number;
}

export class UpsertPlanLimitDto {
  @IsEnum(PlanResource)
  @IsNotEmpty()
  recurso: PlanResource;

  @IsNumber()
  @Min(-1)
  limite: number;
}
