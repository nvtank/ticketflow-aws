import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MetricsService } from './common/http/metrics.service';
import { ConfigurationModule } from './config/configuration.module';
import { HealthModule } from './health/health.module';
import { MonitoringController } from './monitoring/monitoring.controller';

@Module({
  imports: [
    ConfigurationModule,
    HealthModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [MonitoringController],
  providers: [MetricsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
