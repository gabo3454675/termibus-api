import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GpsServicePort, GpsPosition, GpsUnitStatus } from '../ports';

/**
 * Adaptador **real** del servicio GPS (stub / placeholder).
 *
 * ═══════════════════════════════════════════════════════════════
 *  PENDIENTE: Implementar contra el proveedor GPS real.
 * ═══════════════════════════════════════════════════════════════
 *
 * API esperada (proveedor típico GPS tracking):
 *   - GET /api/v1/units/{unitId}/position
 *       → { lat, lng, timestamp, speed, direction }
 *   - GET /api/v1/units/{unitId}/status
 *       → { engineOn, battery, connected, lastPosition? }
 *   - GET /api/v1/terminals/{terminalId}/positions
 *       → { [unitId]: { lat, lng, timestamp, speed, direction } }
 *
 * Configuración desde variables de entorno (`.env`):
 *   - `GPS_API_BASE_URL`   → URL base del proveedor (ej: https://gps.example.com/api/v1)
 *   - `GPS_API_KEY`        → API key o token de autenticación
 *   - `GPS_PROVIDER=real`  → para activar este adaptador
 *
 * Cada método lanza `Error('RealGpsAdapter: no implementado')`
 * para que el sistema falle temprano si se intenta usar sin
 * implementación real.
 *
 * @example
 * ```typescript
 * // Activar en .env:
 * GPS_PROVIDER=real
 * GPS_API_BASE_URL=https://gps.mi-proveedor.com/api
 * GPS_API_KEY=sk-...
 * ```
 */
@Injectable()
export class RealGpsAdapter implements GpsServicePort {
  constructor(private readonly config: ConfigService) {
    // En el futuro, aquí se inicializaría el cliente HTTP
    // con la URL base y API key del proveedor real.
  }

  /**
   * @inheritdoc
   * @throws Error siempre — implementación pendiente.
   */
  async getPosition(_unidadId: string): Promise<GpsPosition | null> {
    throw new Error(
      `RealGpsAdapter.getPosition: no implementado — ` +
        `se necesita conectar con el proveedor GPS configurado en GPS_API_BASE_URL`,
    );
  }

  /**
   * @inheritdoc
   * @throws Error siempre — implementación pendiente.
   */
  async getStatus(_unidadId: string): Promise<GpsUnitStatus> {
    throw new Error(
      `RealGpsAdapter.getStatus: no implementado — ` +
        `se necesita conectar con el proveedor GPS configurado en GPS_API_BASE_URL`,
    );
  }

  /**
   * @inheritdoc
   * @throws Error siempre — implementación pendiente.
   */
  async getLastKnownPositions(
    _terminalId: string,
  ): Promise<Map<string, GpsPosition>> {
    throw new Error(
      `RealGpsAdapter.getLastKnownPositions: no implementado — ` +
        `se necesita conectar con el proveedor GPS configurado en GPS_API_BASE_URL`,
    );
  }
}
