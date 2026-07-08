/**
 * ─────────────────────────────────────────────────────────────
 * CircuitBreakerProxy — Gestor inyectable de Circuit Breakers
 *
 * Proxy que administra múltiples CircuitBreaker por nombre de
 * servicio. Cada servicio externo (GPS, SMS, pagos, etc.) tiene
 * su propio breaker con configuración independiente.
 *
 * ¿Por qué un proxy y no inyectar CircuitBreaker directamente?
 *   - CircuitBreaker se instancia con un `name` y `config`, que
 *     son valores runtime, no tokens de DI. NestJS funciona mejor
 *     con providers inyectables sin parámetros runtime.
 *   - Un solo proxy permite health checks centralizados
 *     (ver `getStates()`).
 *   - Futura integración con métricas (Prometheus, etc.) desde
 *     un solo punto.
 *
 * Thread-safe: todas las operaciones son síncronas en el mismo
 * tick del event loop, no hay condiciones de carrera.
 * ─────────────────────────────────────────────────────────────
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from './circuit-breaker';
import type { CircuitBreakerConfig } from './circuit-breaker-state';
import { CircuitState } from './circuit-breaker-state';

@Injectable()
export class CircuitBreakerProxy {
  private readonly logger = new Logger(CircuitBreakerProxy.name);

  /**
   * Mapa de breakers por nombre de servicio.
   * Se crean bajo demanda en `getBreaker()`.
   */
  private readonly breakers = new Map<string, CircuitBreaker>();

  /**
   * Obtiene (o crea) un CircuitBreaker para el servicio indicado.
   *
   * @param serviceName  Nombre único del servicio (ej: 'gps-service')
   * @param config       Configuración opcional (solo se usa al crear)
   */
  getBreaker(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    let breaker = this.breakers.get(serviceName);

    if (!breaker) {
      breaker = new CircuitBreaker(serviceName, config);
      this.breakers.set(serviceName, breaker);
      this.logger.log(`Breaker creado para servicio "${serviceName}"`);
    }

    return breaker;
  }

  /**
   * Ejecuta `fn()` protegida por el CircuitBreaker del servicio.
   *
   * Es un atajo para `proxy.getBreaker(name).call(fn)`.
   *
   * @param serviceName  Nombre del servicio externo
   * @param fn           Función asíncrona a proteger
   * @param config       Configuración opcional del breaker
   */
  async call<T>(
    serviceName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName, config);
    return breaker.call(fn);
  }

  /**
   * Devuelve el estado de todos los breakers registrados.
   *
   * Útil para:
   *   - Endpoint de health check (/health).
   *   - Dashboard de monitoreo interno.
   *   - Alertas cuando algún circuito está abierto.
   */
  getStates(): Array<{ name: string; state: CircuitState }> {
    const states: Array<{ name: string; state: CircuitState }> = [];
    for (const [name, breaker] of this.breakers) {
      states.push({ name, state: breaker.getState() });
    }
    return states;
  }
}
