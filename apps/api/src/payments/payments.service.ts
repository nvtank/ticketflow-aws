import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
import { PaymentProvider } from './payment-provider';
import { PaymentFinalizationService } from './payment-finalization.service';
import { PaymentSessionsService } from './payment-sessions.service';
import type { SimulatePaymentDto } from './payments.dto';
@Injectable()
export class PaymentsService implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
    @Inject(PaymentProvider) private readonly provider: PaymentProvider,
    @Inject(PaymentSessionsService) private readonly sessions: PaymentSessionsService,
    @Inject(PaymentFinalizationService) private readonly finalizer: PaymentFinalizationService,
  ) {}
  onModuleInit() {
    if (this.env.PAYMENT_RECONCILE_INTERVAL_MS && this.env.PAYMENT_PROVIDER !== 'disabled') {
      this.timer = setInterval(() => {
        void this.reconcile().catch(() =>
          this.logger.warn('Payment reconciliation failed; next scan will retry.'),
        );
      }, this.env.PAYMENT_RECONCILE_INTERVAL_MS);
      this.timer.unref();
    }
  }
  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }
  async webhook(raw: unknown) {
    return this.finalizer.finalize(await this.provider.verifyWebhook(raw));
  }
  private async sync(id: string, force = false) {
    const payment = await this.db.payment.findUniqueOrThrow({ where: { id } });
    if (
      payment.provider !== this.provider.name ||
      payment.providerOrderCode === null ||
      payment.status !== 'PENDING'
    )
      return;
    // A DB claim limits expensive provider reads across API instances. No open tx during I/O.
    const claim = await this.db.payment.updateMany({
      where: {
        id,
        status: 'PENDING',
        ...(force
          ? {}
          : {
              OR: [{ reconciledAt: null }, { reconciledAt: { lt: new Date(Date.now() - 5000) } }],
            }),
      },
      data: { reconciledAt: new Date() },
    });
    if (!claim.count) return;
    await this.finalizer.finalize(
      await this.provider.getPaymentStatus(Number(payment.providerOrderCode)),
    );
  }
  async status(id: string, userId: string) {
    await this.sessions.owned(id, userId);
    await this.sync(id);
    return this.sessions.view(id, userId);
  }
  async simulate(id: string, userId: string, outcome: SimulatePaymentDto['outcome']) {
    if (
      this.env.NODE_ENV === 'production' ||
      this.env.PAYMENT_PROVIDER !== 'mock' ||
      this.provider.name !== 'mock'
    )
      throw new NotFoundException();
    const payment = await this.sessions.owned(id, userId);
    if (payment.provider !== 'mock') throw new NotFoundException();
    if (payment.status !== 'PENDING') throw new ConflictException('Thanh toán đã kết thúc.');
    const status =
      outcome === 'failed' ? 'FAILED' : outcome === 'cancelled' ? 'CANCELLED' : 'SUCCEEDED';
    const rows = await this.db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    await this.db.payment.update({
      where: { id },
      data: {
        mockOutcome: status,
        mockDueAt: new Date(rows[0]!.now.getTime() + (outcome === 'delayed' ? 10000 : 0)),
      },
    });
    if (outcome !== 'delayed') {
      await this.sync(id, true);
      if (outcome === 'duplicate')
        await this.finalizer.finalize(
          await this.provider.getPaymentStatus(Number(payment.providerOrderCode)),
        );
    }
    return this.sessions.view(id, userId);
  }
  async reconcile() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.db.payment.findMany({
        where: {
          provider: this.provider.name,
          status: 'PENDING',
          providerOrderCode: { not: null },
        },
        orderBy: [{ reconciledAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
        take: 20,
        select: { id: true },
      });
      for (const p of pending)
        await this.sync(p.id).catch(() =>
          this.logger.warn('A provider status is temporarily unavailable.'),
        );
    } finally {
      this.running = false;
    }
  }
}
