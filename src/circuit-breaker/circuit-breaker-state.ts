/**
 * ─────────────────────────────────────────────────────────────
 * CircuitBreaker — Estados y configuración
 *
 * Basado en el patrón descrito por Michael T. Nygard en
 * "Release It!" (2007). El Circuit Breaker protege servicios
 * externos de llamadas innecesarias cuando ya están fallando,
 * evitando:
 *   1. Timeouts que bloquean threads / event loop.
 *   2. Degradación en cascada (si el servicio externo está
 *      saturado, más llamadas solo empeoran la situación).
 *   3. Consumo de recursos (conexiones, memoria) en vano.
 *
 * Estados:
 *   CLOSED   → Funcionamiento normal. Las peticiones pasan.
 *   OPEN     → El circuito está abierto. Las peticiones son
 *              rechazadas inmediatamente sin llamar al servicio.
 *   HALF_OPEN → Después del timeout, se permite una petición
 *               de prueba para ver si el servicio se recuperó.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Estados posibles del Circuit Breaker.
 */
export enum CircuitState {
  /** Funcionamiento normal — las peticiones pasan al servicio */
  CLOSED = 'CLOSED',
  /** Fallando — las peticiones son rechazadas inmediatamente */
  OPEN = 'OPEN',
  /** Probando — se permite una petición para verificar recuperación */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Configuración del Circuit Breaker.
 *
 * Cada servicio externo puede tener su propia configuración
 * porque los tiempos de respuesta y tolerancia a fallos varían:
 *   - Un servicio GPS puede tolerar más fallos que un servicio
 *     de pagos (donde cada fallo es crítico).
 *   - Un servicio interno (microservicio en la misma red) puede
 *     tener timeouts más cortos que un SaaS externo.
 */
export interface CircuitBreakerConfig {
  /**
   * Número de fallos consecutivos para abrir el circuito.
   * @default 3
   */
  failureThreshold: number;

  /**
   * Número de éxitos consecutivos en HALF_OPEN para cerrar.
   * @default 2
   */
  successThreshold: number;

  /**
   * Tiempo en milisegundos que el circuito permanece OPEN
   * antes de pasar automáticamente a HALF_OPEN.
   * @default 10_000 (10 segundos)
   */
  timeout: number;

  /**
   * Ventana de tiempo en milisegundos para contar fallos.
   * Se usa en los mensajes de log para indicar el período
   * en que ocurrieron los fallos.
   * @default 30_000 (30 segundos)
   */
  resetTimeout: number;
}

/**
 * Valores por defecto para la configuración.
 *
 * Se eligen pensando en un servicio GPS externo típico:
 *   - 3 fallos antes de abrir (tolerancia a picos breves)
 *   - 2 éxitos en HALF_OPEN para cerrar (confirmación mínima)
 *   - 10 s de espera en OPEN (tiempo razonable para
 *     recuperación de un servicio cloud)
 *   - 30 s de ventana para logging
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 10_000,
  resetTimeout: 30_000,
};
