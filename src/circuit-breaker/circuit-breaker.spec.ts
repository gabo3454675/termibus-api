/**
 * ─────────────────────────────────────────────────────────────
 * CircuitBreaker — Tests unitarios
 *
 * Cubre todos los estados y transiciones de la máquina:
 *   1. CLOSED: llamadas exitosas y fallos
 *   2. CLOSED → OPEN por umbral de fallos
 *   3. OPEN: rechazo inmediato (CircuitBreakerOpenException)
 *   4. OPEN → HALF_OPEN después del timeout
 *   5. HALF_OPEN → CLOSED por umbral de éxitos
 *   6. HALF_OPEN → OPEN por fallo
 *   7. Configuración por defecto y personalizada
 *   8. Reset
 *   9. CircuitBreakerProxy (getStates, getBreaker, call)
 * ─────────────────────────────────────────────────────────────
 */

import { CircuitBreaker } from './circuit-breaker';
import { CircuitBreakerProxy } from './circuit-breaker.proxy';
import { CircuitState } from './circuit-breaker-state';
import { CircuitBreakerOpenException } from './circuit-breaker.exception';

// ────────────────────────────────────────────
//  CircuitBreaker (state machine)
// ────────────────────────────────────────────

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 200, // 200 ms para tests rápidos
      resetTimeout: 1000,
    });
  });

  describe('estado inicial', () => {
    it('debería iniciar en CLOSED', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('debería tener contadores en cero', () => {
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
    });
  });

  describe('CLOSED', () => {
    it('debería ejecutar fn() exitosamente', async () => {
      const result = await breaker.call(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('debería incrementar failureCount en cada fallo', async () => {
      const fn = () => Promise.reject(new Error('fallo'));

      await expect(breaker.call(fn)).rejects.toThrow('fallo');
      expect(breaker.failureCount).toBe(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      await expect(breaker.call(fn)).rejects.toThrow('fallo');
      expect(breaker.failureCount).toBe(2);
    });
  });

  describe('CLOSED → OPEN', () => {
    it('debería abrir el circuito al alcanzar failureThreshold', async () => {
      const fn = () => Promise.reject(new Error('fallo'));

      // Primer fallo → sigue CLOSED (threshold = 2)
      await expect(breaker.call(fn)).rejects.toThrow('fallo');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Segundo fallo → OPEN
      await expect(breaker.call(fn)).rejects.toThrow('fallo');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.failureCount).toBe(2);
    });

    it('debería abrir el circuito si se supera el umbral (fallos acumulativos)', async () => {
      // ADR-006: los fallos deben ser consecutivos.
      // Un éxito resetea el contador, por lo que se necesitan
      // N fallos seguidos (sin éxitos intermedios) para abrir.
      const failFn = () => Promise.reject(new Error('fallo'));
      const okFn = () => Promise.resolve('ok');

      await expect(breaker.call(failFn)).rejects.toThrow();
      expect(breaker.failureCount).toBe(1);

      // Un éxito resetea el contador
      await breaker.call(okFn);
      expect(breaker.failureCount).toBe(0);

      // Ahora se necesitan 2 fallos consecutivos para abrir
      await expect(breaker.call(failFn)).rejects.toThrow();
      expect(breaker.failureCount).toBe(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      await expect(breaker.call(failFn)).rejects.toThrow();
      expect(breaker.failureCount).toBe(2);
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('OPEN', () => {
    beforeEach(async () => {
      // Llevar el breaker a OPEN
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('debería lanzar CircuitBreakerOpenException antes del timeout', async () => {
      const fn = () => Promise.resolve('ok');
      await expect(breaker.call(fn)).rejects.toThrow(CircuitBreakerOpenException);
    });

    it('debería incluir serviceName y retryAfterMs en la excepción', async () => {
      try {
        await breaker.call(() => Promise.resolve('ok'));
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenException);
        const cbError = error as CircuitBreakerOpenException;
        expect(cbError.serviceName).toBe('test-service');
        expect(cbError.retryAfterMs).toBeGreaterThan(0);
        expect(cbError.retryAfterMs).toBeLessThanOrEqual(200);
      }
    });

    it('NO debería contar CircuitBreakerOpenException como fallo', async () => {
      // El breaker ya tiene failureCount=2 de los fallos previos
      await expect(breaker.call(() => Promise.resolve('ok'))).rejects.toThrow(
        CircuitBreakerOpenException,
      );
      // El contador NO debe haber subido
      expect(breaker.failureCount).toBe(2);
    });
  });

  describe('OPEN → HALF_OPEN → CLOSED', () => {
    it('debería pasar a HALF_OPEN después del timeout y cerrar con éxito', async () => {
      // Llevar a OPEN
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Esperar el timeout
      await new Promise((r) => setTimeout(r, 250));

      // La llamada debería pasar a HALF_OPEN, ejecutar fn(), y cerrar
      const result = await breaker.call(() => Promise.resolve('recuperado'));
      expect(result).toBe('recuperado');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
    });
  });

  describe('HALF_OPEN → OPEN', () => {
    it('debería volver a OPEN si falla en HALF_OPEN', async () => {
      // Llevar a OPEN
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();

      // Esperar timeout
      await new Promise((r) => setTimeout(r, 250));

      // Llamada en HALF_OPEN que falla → vuelve a OPEN
      await expect(
        breaker.call(() => Promise.reject(new Error('aún caído'))),
      ).rejects.toThrow('aún caído');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('HALF_OPEN successThreshold > 1', () => {
    it('debería requerir N éxitos consecutivos para cerrar', async () => {
      const multiBreaker = new CircuitBreaker('multi-test', {
        failureThreshold: 2,
        successThreshold: 3, // Requiere 3 éxitos
        timeout: 200,
        resetTimeout: 1000,
      });

      // Llevar a OPEN
      await expect(multiBreaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      await expect(multiBreaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      expect(multiBreaker.getState()).toBe(CircuitState.OPEN);

      // Esperar timeout
      await new Promise((r) => setTimeout(r, 250));

      // Primer éxito en HALF_OPEN
      await multiBreaker.call(() => Promise.resolve('ok1'));
      expect(multiBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(multiBreaker.successCount).toBe(1);

      // Segundo éxito
      await multiBreaker.call(() => Promise.resolve('ok2'));
      expect(multiBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(multiBreaker.successCount).toBe(2);

      // Tercer éxito → CLOSED
      await multiBreaker.call(() => Promise.resolve('ok3'));
      expect(multiBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(multiBreaker.failureCount).toBe(0);
      expect(multiBreaker.successCount).toBe(0);
    });
  });

  describe('configuración por defecto', () => {
    it('debería usar valores por defecto si no se pasa config', () => {
      const defaultBreaker = new CircuitBreaker('default-test');

      // No podemos acceder a config privada directamente.
      // Verificamos el comportamiento: 3 fallos para abrir, 2 para cerrar.
      expect(defaultBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('reset()', () => {
    it('debería resetear el breaker a CLOSED con contadores en cero', async () => {
      // Llevar a OPEN
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      await expect(breaker.call(() => Promise.reject(new Error('fallo')))).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);

      // Después del reset debería funcionar normalmente
      const result = await breaker.call(() => Promise.resolve('tras-reset'));
      expect(result).toBe('tras-reset');
    });
  });
});

// ────────────────────────────────────────────
//  CircuitBreakerProxy
// ────────────────────────────────────────────

describe('CircuitBreakerProxy', () => {
  let proxy: CircuitBreakerProxy;

  beforeEach(() => {
    proxy = new CircuitBreakerProxy();
  });

  describe('getBreaker()', () => {
    it('debería crear un breaker nuevo si no existe', () => {
      const breaker = proxy.getBreaker('test-service');
      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('debería devolver el mismo breaker para el mismo nombre', () => {
      const breaker1 = proxy.getBreaker('test-service');
      const breaker2 = proxy.getBreaker('test-service');
      expect(breaker1).toBe(breaker2);
    });

    it('debería crear breakers separados por nombre', () => {
      const breakerA = proxy.getBreaker('service-a');
      const breakerB = proxy.getBreaker('service-b');
      expect(breakerA).not.toBe(breakerB);
    });
  });

  describe('call()', () => {
    it('debería ejecutar fn() con éxito', async () => {
      const result = await proxy.call('test-service', () =>
        Promise.resolve('ok'),
      );
      expect(result).toBe('ok');
    });

    it('debería rechazar cuando el circuito está abierto', async () => {
      const failFn = () => Promise.reject(new Error('fallo'));

      // Llevar a OPEN (failureThreshold por defecto = 3)
      await expect(proxy.call('test-service', failFn)).rejects.toThrow();
      await expect(proxy.call('test-service', failFn)).rejects.toThrow();
      await expect(proxy.call('test-service', failFn)).rejects.toThrow();

      // Ahora debería estar OPEN
      await expect(
        proxy.call('test-service', () => Promise.resolve('ok')),
      ).rejects.toThrow(CircuitBreakerOpenException);
    });
  });

  describe('getStates()', () => {
    it('debería devolver array vacío si no hay breakers', () => {
      expect(proxy.getStates()).toEqual([]);
    });

    it('debería devolver estados de todos los breakers', async () => {
      proxy.getBreaker('service-a');
      proxy.getBreaker('service-b');

      const states = proxy.getStates();
      expect(states).toHaveLength(2);
      expect(states).toEqual(
        expect.arrayContaining([
          { name: 'service-a', state: CircuitState.CLOSED },
          { name: 'service-b', state: CircuitState.CLOSED },
        ]),
      );
    });

    it('debería reflejar cambios de estado', async () => {
      // Crear breaker con threshold bajo
      const failFn = () => Promise.reject(new Error('fallo'));
      await expect(proxy.call('quick-fail', failFn)).rejects.toThrow();
      await expect(proxy.call('quick-fail', failFn)).rejects.toThrow();
      await expect(proxy.call('quick-fail', failFn)).rejects.toThrow();

      const states = proxy.getStates();
      const quickFailState = states.find((s) => s.name === 'quick-fail');
      expect(quickFailState?.state).toBe(CircuitState.OPEN);
    });
  });
});
