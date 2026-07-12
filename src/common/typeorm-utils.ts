import { FindOptionsWhere } from 'typeorm';

/**
 * Strips null/undefined values from a TypeORM where clause.
 * TypeORM throws when null is passed directly — this prevents that.
 */
export function cleanWhere<T extends Record<string, unknown>>(
  where: T,
): FindOptionsWhere<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as FindOptionsWhere<T>;
}
