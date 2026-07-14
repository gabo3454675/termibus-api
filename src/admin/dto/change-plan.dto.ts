import { IsUUID, IsNotEmpty } from 'class-validator';

export class ChangePlanDto {
  @IsUUID()
  @IsNotEmpty()
  plan_id: string;
}