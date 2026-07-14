import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path ?? 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const statusClass = `${Math.floor(statusCode / 100)}xx`;

          this.metricsService.incrementCounter('http_requests_total', {
            method,
            route,
            status: statusClass,
          });
          this.metricsService.observeHistogram(
            'http_request_duration_ms',
            { method, route },
            duration,
          );
        },
        error: () => {
          const duration = Date.now() - start;
          this.metricsService.incrementCounter('http_requests_total', {
            method,
            route,
            status: '5xx',
          });
          this.metricsService.observeHistogram(
            'http_request_duration_ms',
            { method, route },
            duration,
          );
        },
      }),
    );
  }
}