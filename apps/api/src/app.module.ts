import { EventsModule } from './events/events.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MetricsService } from './common/http/metrics.service';
import { ConfigurationModule } from './config/configuration.module';
import { HealthModule } from './health/health.module';
import { MonitoringController } from './monitoring/monitoring.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [
    ConfigurationModule,
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EventsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [MonitoringController],
  providers: [
    MetricsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
