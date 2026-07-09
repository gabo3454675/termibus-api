import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RecuperarPasajeroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula: string;
}
