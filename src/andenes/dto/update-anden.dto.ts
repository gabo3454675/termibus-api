import { PartialType } from '@nestjs/mapped-types';
import { CreateAndenDto } from './create-anden.dto';

export class UpdateAndenDto extends PartialType(CreateAndenDto) {}
