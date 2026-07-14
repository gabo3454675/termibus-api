import { IsString, IsNotEmpty, IsEmail, IsEnum } from 'class-validator';
import { OrganizationRole } from '../../common/enums';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(OrganizationRole)
  @IsNotEmpty()
  rol: OrganizationRole;
}