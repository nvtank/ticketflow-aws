import { Controller, ForbiddenException, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from '../common/http/metrics.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';

@ApiTags('Local monitoring')
@Controller('metrics')
export class MonitoringController {
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Measured HTTP counters for this process (development/test only)' })
  snapshot() {
    if (this.environment.NODE_ENV === 'production') throw new ForbiddenException();
    return this.metrics.snapshot();
  }
}
