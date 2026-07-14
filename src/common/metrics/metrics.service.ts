import { Injectable } from '@nestjs/common';

interface CounterEntry {
  name: string;
  labels: Record<string, string>;
  value: number;
}

interface HistogramEntry {
  name: string;
  labels: Record<string, string>;
  values: number[];
}

@Injectable()
export class MetricsService {
  private counters = new Map<string, CounterEntry>();
  private histograms = new Map<string, HistogramEntry>();

  private counterKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}|${labelStr}`;
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.counterKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { name, labels, value });
    }
  }

  observeHistogram(name: string, labels: Record<string, string> = {}, value: number): void {
    const key = this.counterKey(name, labels);
    const existing = this.histograms.get(key);
    if (existing) {
      if (existing.values.length < 1000) {
        existing.values.push(value);
      } else {
        // Reservoir sampling: reemplazar muestra aleatoria
        const idx = Math.floor(Math.random() * existing.values.length);
        existing.values[idx] = value;
      }
    } else {
      this.histograms.set(key, { name, labels, values: [value] });
    }
  }

  getCounters(): CounterEntry[] {
    return Array.from(this.counters.values());
  }

  getHistograms(): HistogramEntry[] {
    return Array.from(this.histograms.values());
  }

  /** Calcula percentil de un histograma */
  getPercentile(name: string, labels: Record<string, string>, percentile: number): number | null {
    const key = this.counterKey(name, labels);
    const entry = this.histograms.get(key);
    if (!entry || entry.values.length === 0) return null;
    const sorted = [...entry.values].sort((a, b) => a - b);
    const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  }

  /** Formato Prometheus text/plain */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Counters — agrupar por nombre, un solo # TYPE
    const counterNames = new Set<string>();
    for (const counter of this.counters.values()) {
      counterNames.add(counter.name);
    }
    for (const name of counterNames) {
      lines.push(`# TYPE ${name} counter`);
      const entries = Array.from(this.counters.values()).filter((c) => c.name === name);
      for (const counter of entries) {
        const labelStr = Object.entries(counter.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${counter.name}{${labelStr}} ${counter.value}`);
      }
    }

    // Histograms — emitir como summary con quantile label
    const histNames = new Set<string>();
    for (const hist of this.histograms.values()) {
      histNames.add(hist.name);
    }
    for (const name of histNames) {
      lines.push(`# TYPE ${name} summary`);
      const entries = Array.from(this.histograms.values()).filter((h) => h.name === name);
      for (const hist of entries) {
        const labelStr = Object.entries(hist.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const count = hist.values.length;
        const sum = hist.values.reduce((a, b) => a + b, 0);
        const p95 = this.getPercentile(hist.name, hist.labels, 95) ?? 0;
        lines.push(`${hist.name}_count{${labelStr}} ${count}`);
        lines.push(`${hist.name}_sum{${labelStr}} ${sum}`);
        lines.push(`${hist.name}{${labelStr},quantile="0.95"} ${p95}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /** Formato JSON para el endpoint /admin/metrics */
  toJSON(): {
    counters: CounterEntry[];
    histograms: Array<{
      name: string;
      labels: Record<string, string>;
      count: number;
      sum: number;
      avg: number;
      min: number;
      max: number;
      p95: number;
    }>;
  } {
    const histograms = Array.from(this.histograms.values()).map((h) => {
      const count = h.values.length;
      const sum = h.values.reduce((a, b) => a + b, 0);
      const avg = count > 0 ? sum / count : 0;
      const min = count > 0 ? h.values.reduce((a, b) => Math.min(a, b), Infinity) : 0;
      const max = count > 0 ? h.values.reduce((a, b) => Math.max(a, b), -Infinity) : 0;
      const p95 = this.getPercentile(h.name, h.labels, 95) ?? 0;
      return { name: h.name, labels: h.labels, count, sum, avg, min, max, p95 };
    });

    return {
      counters: this.getCounters(),
      histograms,
    };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}