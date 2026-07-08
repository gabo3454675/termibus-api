import { PartialType } from '@nestjs/mapped-types';
import { CreateLineaDto } from './create-linea.dto';

export class UpdateLineaDto extends PartialType(CreateLineaDto) {}
