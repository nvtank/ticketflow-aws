import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { SeatHoldsService } from './seat-holds.service';
import { HoldLifecycleService } from './hold-lifecycle.service';
import { BookingSnapshotService } from './booking-snapshot.service';
import { BookingMetrics } from './booking-metrics';
import { OrdersService } from '../orders/orders.service';
import { OrdersController } from '../orders/orders.controller';
@Module({
  providers: [
    SeatHoldsService,
    HoldLifecycleService,
    BookingSnapshotService,
    BookingMetrics,
    OrdersService,
  ],
  controllers: [BookingController, OrdersController],
  exports: [BookingMetrics, HoldLifecycleService, SeatHoldsService],
})
export class BookingModule {}
