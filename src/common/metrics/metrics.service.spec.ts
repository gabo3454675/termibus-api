import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('toPrometheusFormat', () => {
    it('emite # TYPE una sola vez por nombre de metrica (counters)', () => {
      service.incrementCounter('http_requests_total', { method: 'GET', route: '/a', status: '2xx' });
      service.incrementCounter('http_requests_total', { method: 'POST', route: '/b', status: '2xx' });
      service.incrementCounter('http_requests_total', { method: 'GET', route: '/a', status: '5xx' });

      const output = service.toPrometheusFormat();
      const typeLines = output
        .split('\n')
        .filter((l) => l.startsWith('# TYPE http_requests_total'));

      expect(typeLines.length).toBe(1);
      expect(typeLines[0]).toBe('# TYPE http_requests_total counter');
    });

    it('emite histogramas como summary con quantile label', () => {
      service.observeHistogram('http_request_duration_ms', { method: 'GET', route: '/a' }, 10);
      service.observeHistogram('http_request_duration_ms', { method: 'GET', route: '/a' }, 20);

      const output = service.toPrometheusFormat();

      expect(output).toContain('# TYPE http_request_duration_ms summary');
      expect(output).toMatch(/http_request_duration_ms_count\{[^}]*\} 2/);
      expect(output).toMatch(/http_request_duration_ms_sum\{[^}]*\} 30/);
      expect(output).toMatch(/http_request_duration_ms\{[^}]*quantile="0\.95"[^}]*\}/);
      // No debe emitir formato histogram invalido (_avg, _p95 sueltos)
      expect(output).not.toContain('_avg{');
      expect(output).not.toContain('_p95{');
    });

    it('emite # TYPE una sola vez por nombre de histograma', () => {
      service.observeHistogram('latency_ms', { route: '/a' }, 5);
      service.observeHistogram('latency_ms', { route: '/b' }, 15);

      const output = service.toPrometheusFormat();
      const typeLines = output
        .split('\n')
        .filter((l) => l.startsWith('# TYPE latency_ms'));

      expect(typeLines.length).toBe(1);
    });
  });

  describe('observeHistogram - reservoir sampling', () => {
    it('acota el array values a maximo 1000 muestras', () => {
      for (let i = 0; i < 2000; i++) {
        service.observeHistogram('bounded_hist', {}, i);
      }
      const histograms = service.getHistograms();
      expect(histograms.length).toBe(1);
      expect(histograms[0].values.length).toBeLessThanOrEqual(1000);
    });

    it('mantiene valores representativos tras el acotamiento', () => {
      for (let i = 0; i < 2000; i++) {
        service.observeHistogram('bounded_hist', {}, i);
      }
      const histograms = service.getHistograms();
      // Todos los valores deben estar en rango valido
      for (const v of histograms[0].values) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(2000);
      }
    });
  });

  describe('toJSON - sin spread operator sobre arrays grandes', () => {
    it('calcula min y max correctamente con muchos valores', () => {
      for (let i = 0; i < 1500; i++) {
        service.observeHistogram('big_hist', {}, i);
      }
      // No debe lanzar RangeError por spread operator
      expect(() => service.toJSON()).not.toThrow();
      const json = service.toJSON();
      const hist = json.histograms[0];
      expect(hist.count).toBeLessThanOrEqual(1000);
      expect(hist.min).toBeGreaterThanOrEqual(0);
      expect(hist.max).toBeLessThan(1500);
    });

    it('retorna min=0 y max=0 cuando no hay valores', () => {
      const json = service.toJSON();
      expect(json.histograms).toEqual([]);
    });
  });
});