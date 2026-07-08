import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MockGpsAdapter } from '../adapters/mock-gps.adapter';
import { RealGpsAdapter } from '../adapters/real-gps.adapter';
import { CircuitBreakerProxy } from '../circuit-breaker';

/**
 * Módulo de servicios externos.
 *
 * Aplica el patrón **Ports & Adapters**:
 *   - Expone el token `'GPS_SERVICE'` para que cualquier
 *     módulo o servicio pueda inyectar el puerto GPS sin
 *     conocer la implementación concreta.
 *   - La implementación se elige en tiempo de construcción
 *     mediante la variable de entorno `GPS_PROVIDER`.
 *
 * Uso en un servicio consumidor:
 * ```typescript
 * @Injectable()
 * export class MiServicio {
 *   constructor(
 *     @Inject('GPS_SERVICE') private readonly gps: GpsServicePort,
 *   ) {}
 * }
 * ```
 *
 * Variables de entorno utilizadas:
 *   - `GPS_PROVIDER` → `'mock'` (default) o `'real'`
 */
@Module({
  imports: [
    ConfigModule,
    // HttpModule se importa preparado para el adaptador real,
    // que necesitará hacer peticiones HTTP al proveedor GPS.
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('GPS_API_BASE_URL'),
        timeout: 10_000,
        maxRedirects: 2,
      }),
    }),
  ],
  providers: [
    {
      /**
       * Proveedor con token string `'GPS_SERVICE'`.
       *
       * Se usa un string literal como token en lugar de una clase
       * para que el módulo importador pueda intercambiar la
       * implementación sin modificar las importaciones ni el
       * árbol de dependencias.
       */
      provide: 'GPS_SERVICE',
      useFactory: (config: ConfigService, circuitBreaker: CircuitBreakerProxy) => {
        const provider = config.get<string>('GPS_PROVIDER', 'mock');
        if (provider === 'real') {
          return new RealGpsAdapter(config);
        }
        return new MockGpsAdapter(circuitBreaker);
      },
      inject: [ConfigService, CircuitBreakerProxy],
    },
  ],
  exports: ['GPS_SERVICE'],
})
export class ExternalModule {}
