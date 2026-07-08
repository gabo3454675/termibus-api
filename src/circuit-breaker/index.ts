/**
 * ─────────────────────────────────────────────────────────────
 * Circuit Breaker — Barrel exports
 *
 * Punto de entrada único para imports externos.
 * Los archivos dentro del módulo pueden importar entre sí
 * directamente por ruta relativa.
 * ─────────────────────────────────────────────────────────────
 */

export { CircuitBreaker } from './circuit-breaker';
export { CircuitBreakerProxy } from './circuit-breaker.proxy';
export { CircuitBreakerModule } from './circuit-breaker.module';
export { CircuitState } from './circuit-breaker-state';
export type { CircuitBreakerConfig } from './circuit-breaker-state';
export { CircuitBreakerOpenException } from './circuit-breaker.exception';
