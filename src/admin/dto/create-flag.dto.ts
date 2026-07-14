import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  default_enabled?: boolean;
}

export class UpdateFlagDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  default_enabled?: boolean;
}