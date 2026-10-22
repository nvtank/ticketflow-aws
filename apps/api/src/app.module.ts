import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MetricsService } from './common/http/metrics.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  providers: [MetricsService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
