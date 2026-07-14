import { Controller, Get, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard, PlatformAdminGuard } from '../../common/guards';
import { MetricsService } from '../../common/metrics/metrics.service';
import type { Response } from 'express';

@Controller('admin/metrics')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(): { success: true; data: ReturnType<MetricsService['toJSON']> } {
    return { success: true, data: this.metricsService.toJSON() };
  }

  @Get('prometheus')
  getPrometheusMetrics(@Res({ passthrough: true }) res: Response) {
    const prometheusData = this.metricsService.toPrometheusFormat();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.send(prometheusData);
  }
}