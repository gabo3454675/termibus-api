import { MetricsService } from './metrics.service';

export function TrackMetric(name: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const metricsService: MetricsService | undefined = (this as any).metricsService;
      const start = Date.now();

      if (!metricsService && process.env.NODE_ENV !== 'production') {
        console.warn(
          `@TrackMetric('${name}') usado en ${String(propertyKey)} pero this.metricsService no está inyectado`,
        );
      }

      const handleError = (error: any) => {
        const duration = Date.now() - start;
        if (metricsService) {
          metricsService.incrementCounter(name, { status: 'error' });
          metricsService.observeHistogram(`${name}_duration_ms`, { method: propertyKey.toString() }, duration);
        }
        throw error;
      };

      const handleSuccess = (result: any) => {
        const duration = Date.now() - start;
        if (metricsService) {
          metricsService.incrementCounter(name, { status: 'success' });
          metricsService.observeHistogram(`${name}_duration_ms`, { method: propertyKey.toString() }, duration);
        }
        return result;
      };

      try {
        const result = originalMethod.apply(this, args);
        // Si el resultado es una Promise, encadenar then/catch
        if (result && typeof result.then === 'function') {
          return result.then(handleSuccess).catch(handleError);
        }
        // Si es síncrono, registrar y devolver
        return handleSuccess(result);
      } catch (error) {
        handleError(error);
      }
    };

    return descriptor;
  };
}