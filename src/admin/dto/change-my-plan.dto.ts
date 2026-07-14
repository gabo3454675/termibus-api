import { IsString, IsNotEmpty } from 'class-validator';

export class ChangeMyPlanDto {
  @IsString()
  @IsNotEmpty()
  plan_id: string;
}
