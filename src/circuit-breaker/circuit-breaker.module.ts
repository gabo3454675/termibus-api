/**
 * ─────────────────────────────────────────────────────────────
 * CircuitBreakerModule — Módulo global del Circuit Breaker
 *
 * Se marca como `@Global()` para que `CircuitBreakerProxy`
 * esté disponible en todos los módulos sin necesidad de
 * importar este módulo explícitamente cada vez.
 *
 * ¿Por qué global?
 *   - El Circuit Breaker es una preocupación transversal
 *     (cross-cutting) como logging o configuración.
 *   - Casi cualquier servicio que llame a un externo
 *     necesitará el proxy.
 *   - Evita imports repetitivos en N módulos.
 * ─────────────────────────────────────────────────────────────
 */

import { Global, Module } from '@nestjs/common';
import { CircuitBreakerProxy } from './circuit-breaker.proxy';

@Global()
@Module({
  providers: [CircuitBreakerProxy],
  exports: [CircuitBreakerProxy],
})
export class CircuitBreakerModule {}
