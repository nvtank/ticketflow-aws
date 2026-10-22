import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { Public } from '../auth/auth.decorators';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness (does not imply dependency readiness)' })
  live() {
    return { status: 'ok', service: 'tixflow-api', timestamp: new Date().toISOString() };
  }

  @Get()
  @ApiOperation({ summary: 'Readiness: actual PostgreSQL query and Redis PING' })
  @ApiResponse({ status: 200, description: 'All dependencies ready' })
  @ApiResponse({ status: 503, description: 'One or more dependencies unavailable' })
  async readiness(@Res({ passthrough: true }) response: Response) {
    const result = await this.health.check();
    response.setHeader('Cache-Control', 'no-store');
    response.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
