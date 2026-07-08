import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { EstadoAnden } from '../../common/enums';

export class CreateAndenDto {
  @IsInt()
  @Min(1)
  numero: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(EstadoAnden)
  estado?: EstadoAnden;

  @IsUUID()
  terminal_id: string;
}
