import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEmail()
  email_contacto: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  pais?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
