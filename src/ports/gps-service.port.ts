/**
 * ─────────────────────────────────────────────────────────────
 * Puerto (interfaz) del servicio GPS externo.
 *
 * Sigue el patrón Ports & Adapters (Alistair Cockburn):
 *   - El **puerto** (este archivo) define el contrato que el
 *     negocio necesita, sin acoplarse a ningún proveedor real.
 *   - Los **adaptadores** (mock, real) implementan este contrato.
 *
 * Al depender de esta interfaz en lugar de una clase concreta,
 * se puede cambiar de proveedor GPS sin modificar el código
 * de negocio que consume la posición de las unidades.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Posición GPS de una unidad de transporte.
 *
 * Se utiliza en todo el flujo de despacho en tiempo real:
 * - Para ubicar unidades cercanas a un andén.
 * - Para alimentar el tablero de monitoreo.
 * - Para calcular tiempos estimados de llegada.
 */
export interface GpsPosition {
  /** Latitud en grados decimales (WGS84) */
  lat: number;
  /** Longitud en grados decimales (WGS84) */
  lng: number;
  /** Momento en que el dispositivo GPS reportó la posición */
  timestamp: Date;
  /** Velocidad instantánea en km/h (0 = detenido) */
  velocidad: number;
  /** Rumbo en grados sexagesimales, 0 = norte, 90 = este, 180 = sur, 270 = oeste */
  direccion: number;
}

/**
 * Estado del módulo GPS embarcado en una unidad.
 *
 * Permite detectar unidades que están operativas pero con
 * el GPS apagado o con batería baja, y tomar decisiones
 * de asignación en consecuencia.
 */
export interface GpsUnitStatus {
  /** Indica si el motor del vehículo está encendido */
  encendido: boolean;
  /** Nivel de batería del dispositivo GPS (0-100) */
  bateria: number;
  /** Indica si el dispositivo tiene conexión de datos activa */
  conectado: boolean;
  /** Última posición conocida (puede estar desactualizada si el
   *  dispositivo perdió conectividad) */
  ultimaPosicion?: GpsPosition;
}

/**
 * Puerto del servicio GPS externo.
 *
 * Métodos asíncronos porque las implementaciones reales harán
 * llamadas HTTP/WebSocket a un proveedor externo.
 *
 * Las implementaciones mock deben respetar esta misma firma
 * para que el resto del sistema no distinga entre mock y real.
 */
export interface GpsServicePort {
  /**
   * Obtiene la posición actual de una unidad.
   *
   * Devuelve `null` si la unidad no existe o no tiene señal GPS.
   *
   * ¿Por qué no lanzar excepción?
   *   - La ausencia de señal es un caso de negocio esperado
   *     (unidad apagada, dentro de un galpón, etc.).
   *   - El consumidor debe decidir cómo manejarlo.
   *
   * @param unidadId - ID único de la unidad (UUID).
   */
  getPosition(unidadId: string): Promise<GpsPosition | null>;

  /**
   * Obtiene el estado completo del módulo GPS de una unidad.
   *
   * A diferencia de `getPosition`, este método **siempre**
   * devuelve un estado aunque no haya posición actual.
   * Esto permite saber si el dispositivo está encendido
   * aunque temporalmente sin señal.
   *
   * @param unidadId - ID único de la unidad (UUID).
   */
  getStatus(unidadId: string): Promise<GpsUnitStatus>;

  /**
   * Obtiene la última posición conocida de **todas** las
   * unidades asociadas a una terminal.
   *
   * Devuelve un Map<unidadId, GpsPosition> para acceso O(1).
   * Útil para el tablero de despacho que necesita mostrar
   * todas las unidades de una terminal simultáneamente.
   *
   * @param terminalId - ID único de la terminal (UUID).
   */
  getLastKnownPositions(
    terminalId: string,
  ): Promise<Map<string, GpsPosition>>;
}
