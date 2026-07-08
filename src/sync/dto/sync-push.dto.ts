import { IsString, IsNotEmpty, IsIn, IsObject, IsArray, ValidateNested, ArrayMaxSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

const ALLOWED_ENTITIES = ['despacho', 'anden', 'unidad', 'conductor'] as const;

export class SyncChangeDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsIn(ALLOWED_ENTITIES)
  entity: string;

  @IsString()
  @IsIn(['CREATE', 'UPDATE', 'DELETE'])
  @IsNotEmpty()
  action: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class SyncPushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => SyncChangeDto)
  changes: SyncChangeDto[];
}
