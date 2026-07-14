import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleFeatureDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}