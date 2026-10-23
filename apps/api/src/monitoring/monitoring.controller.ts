import { DatabaseService } from '../database/database.service';
import { BookingMetrics } from '../booking/booking-metrics';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Controller, ForbiddenException, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from '../common/http/metrics.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { Public } from '../auth/auth.decorators';

@ApiTags('Local monitoring')
@Public()
@Controller('metrics')
export class MonitoringController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(BookingMetrics) private readonly bookings: BookingMetrics,
    @Inject(RealtimeGateway) private readonly realtime: RealtimeGateway,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Measured HTTP counters for this process (development/test only)' })
  async snapshot() {
    if (this.environment.NODE_ENV === 'production') throw new ForbiddenException();
    let validHeldSeats: number | null = null;
    try {
      const rows = await this.db.$queryRaw<
        { count: number }[]
      >`SELECT COUNT(*)::int AS count FROM "Seat" s JOIN "SeatHold" h ON h."id"=s."holdId" WHERE s."status"='HELD' AND h."releasedAt" IS NULL AND h."expiresAt">clock_timestamp()`;
      validHeldSeats = rows[0]!.count;
    } catch {
      /* Actual dependency failure; never fabricate zero. */
    }
    return {
      ...this.metrics.snapshot(),
      ...this.bookings.snapshot(),
      ...this.realtime.snapshot(),
      validHeldSeats,
    };
  }
}
