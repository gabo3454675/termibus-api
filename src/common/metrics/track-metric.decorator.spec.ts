import { TrackMetric } from './track-metric.decorator';
import { MetricsService } from './metrics.service';

class FakeMetricsService {
  readonly counters: Array<{ name: string; labels: Record<string, string> }> = [];
  readonly histograms: Array<{ name: string; labels: Record<string, string>; value: number }> = [];

  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    this.counters.push({ name, labels });
  }

  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    this.histograms.push({ name, labels, value });
  }
}

/** Aplica el decorator a un metodo de instancia y devuelve el nuevo descriptor.value. */
function applyDecorator(
  target: any,
  key: string,
  decorator: MethodDecorator,
): (...args: any[]) => any {
  const descriptor = Object.getOwnPropertyDescriptor(target, key)!;
  decorator(target, key, descriptor);
  return descriptor.value;
}

describe('@TrackMetric', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('metodo async', () => {
    it('registra success y duration cuando resuelve', async () => {
      const metrics = new FakeMetricsService();
      const service = {
        metricsService: metrics as unknown as MetricsService,
        async doWork(value: number): Promise<number> {
          return value * 2;
        },
      };

      service.doWork = applyDecorator(service, 'doWork', TrackMetric('work'));

      const result = await service.doWork(5);

      expect(result).toBe(10);
      expect(metrics.counters).toEqual([{ name: 'work', labels: { status: 'success' } }]);
      expect(metrics.histograms).toHaveLength(1);
      expect(metrics.histograms[0].name).toBe('work_duration_ms');
      expect(metrics.histograms[0].labels).toEqual({ method: 'doWork' });
      expect(metrics.histograms[0].value).toBeGreaterThanOrEqual(0);
    });

    it('registra error y duration cuando rechaza', async () => {
      const metrics = new FakeMetricsService();
      const service = {
        metricsService: metrics as unknown as MetricsService,
        async doWork(): Promise<void> {
          throw new Error('boom');
        },
      };

      service.doWork = applyDecorator(service, 'doWork', TrackMetric('work'));

      await expect(service.doWork()).rejects.toThrow('boom');

      expect(metrics.counters).toEqual([{ name: 'work', labels: { status: 'error' } }]);
      expect(metrics.histograms).toHaveLength(1);
      expect(metrics.histograms[0].name).toBe('work_duration_ms');
    });
  });

  describe('metodo sync', () => {
    it('registra success sin convertir a Promise', () => {
      const metrics = new FakeMetricsService();
      const service = {
        metricsService: metrics as unknown as MetricsService,
        doSync(value: number): number {
          return value + 1;
        },
      };

      service.doSync = applyDecorator(service, 'doSync', TrackMetric('sync_work'));

      const result = service.doSync(10);

      // Debe devolver valor directo, no Promise
      expect(result).toBe(11);
      expect(result).not.toBeInstanceOf(Promise);

      expect(metrics.counters).toEqual([{ name: 'sync_work', labels: { status: 'success' } }]);
      expect(metrics.histograms).toHaveLength(1);
      expect(metrics.histograms[0].name).toBe('sync_work_duration_ms');
    });

    it('registra error sin convertir a Promise', () => {
      const metrics = new FakeMetricsService();
      const service = {
        metricsService: metrics as unknown as MetricsService,
        doSync(): number {
          throw new Error('sync boom');
        },
      };

      service.doSync = applyDecorator(service, 'doSync', TrackMetric('sync_work'));

      expect(() => service.doSync()).toThrow('sync boom');

      expect(metrics.counters).toEqual([{ name: 'sync_work', labels: { status: 'error' } }]);
      expect(metrics.histograms).toHaveLength(1);
    });
  });

  describe('metricsService ausente', () => {
    it('emite warning en desarrollo (NODE_ENV !== production)', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const service = {
        // sin metricsService
        doSync(): number {
          return 1;
        },
      };

      service.doSync = applyDecorator(service, 'doSync', TrackMetric('orphan'));

      service.doSync();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("@TrackMetric('orphan')"),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('this.metricsService no está inyectado'),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('no emite warning en produccion (NODE_ENV === production)', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const service = {
        doSync(): number {
          return 1;
        },
      };

      service.doSync = applyDecorator(service, 'doSync', TrackMetric('orphan'));

      service.doSync();

      expect(warnSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});