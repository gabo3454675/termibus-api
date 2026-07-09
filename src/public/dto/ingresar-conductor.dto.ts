import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IngresarConductorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula: string;
}
