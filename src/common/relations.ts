import { FindOptionsRelations } from 'typeorm';
import { Despacho } from '../entities/despacho.entity';
import { Unidad } from '../entities/unidad.entity';

export const DESPACHO_RELATIONS: FindOptionsRelations<Despacho> = {
  unidad: { linea: true },
  conductor: true,
  anden: true,
  destino: true,
};

export const UNIDAD_LINEA_REL: FindOptionsRelations<Unidad> = {
  linea: true,
};
