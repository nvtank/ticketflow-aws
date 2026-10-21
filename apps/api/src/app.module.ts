import { NotificationsModule } from './notifications/notifications.module';
import { WaitingRoomModule } from './waiting-room/waiting-room.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { CheckInModule } from './check-in/check-in.module';
import { PaymentsModule } from './payments/payments.module';
import { BookingModule } from './booking/booking.module';
import { RealtimeModule } from './realtime/realtime.module';
import { EventsModule } from './events/events.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MetricsModule } from './common/http/metrics.service';
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
    WaitingRoomModule,
    NotificationsModule,
    MetricsModule,
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EventsModule,
    RealtimeModule,
    BookingModule,
    PaymentsModule,
    CheckInModule,
    AnalyticsModule,
    AdminModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [MonitoringController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
