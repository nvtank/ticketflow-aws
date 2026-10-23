import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { PaymentProvider } from './payment-provider';
import { PayOSPaymentProvider } from './providers/payos.provider';
import { MockPaymentProvider } from './providers/mock.provider';
import { DisabledPaymentProvider } from './providers/disabled.provider';
import { PaymentSessionsService } from './payment-sessions.service';
import { PaymentFinalizationService } from './payment-finalization.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TicketsService } from '../tickets/tickets.service';
import { TicketsController } from '../tickets/tickets.controller';
@Module({
  imports: [BookingModule],
  controllers: [PaymentsController, TicketsController],
  providers: [
    {
      provide: PaymentProvider,
      inject: [ENVIRONMENT, DatabaseService],
      useFactory: (env: Environment, db: DatabaseService) => {
        if (env.PAYMENT_PROVIDER === 'payos') return new PayOSPaymentProvider(env);
        if (env.PAYMENT_PROVIDER === 'mock') return new MockPaymentProvider(env, db);
        return new DisabledPaymentProvider();
      },
    },
    PaymentSessionsService,
    PaymentFinalizationService,
    PaymentsService,
    TicketsService,
  ],
  exports: [PaymentProvider, PaymentFinalizationService, PaymentsService, TicketsService],
})
export class PaymentsModule {}
