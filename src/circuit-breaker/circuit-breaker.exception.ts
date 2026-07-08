/**
 * ─────────────────────────────────────────────────────────────
 * CircuitBreakerOpenException — Error controlado
 *
 * Se lanza cuando el Circuit Breaker está en estado OPEN y
 * se intenta ejecutar una función. NO es un error del servicio
 * externo, sino una protección del sistema para evitar llamadas
 * innecesarias mientras el servicio se recupera.
 *
 * Se usa `extends Error` en lugar de una exception NestJS porque:
 *   1. No pertenece a la capa HTTP — puede usarse desde
 *      adaptadores, servicios, workers, etc.
 *   2. NestJS convierte automáticamente cualquier `Error` no
 *      manejado en una respuesta 500, o puede capturarse con
 *      un filter para devolver 503 (Service Unavailable).
 *   3. Mantiene el CB desacoplado del framework.
 *
 * ❌ NO debe atparse como fallo del servicio externo.
 *    El CircuitBreaker ignora esta excepción en su contador.
 * ─────────────────────────────────────────────────────────────
 */

export class CircuitBreakerOpenException extends Error {
  constructor(
    /** Nombre del servicio protegido (ej: 'gps-service') */
    public readonly serviceName: string,
    /** Tiempo en ms que falta para el próximo reintento */
    public readonly retryAfterMs: number,
  ) {
    super(
      `CircuitBreaker [${serviceName}]: circuito ABIERTO. ` +
        `Reintentar en ${(retryAfterMs / 1000).toFixed(1)}s.`,
    );
    this.name = 'CircuitBreakerOpenException';
  }
}
