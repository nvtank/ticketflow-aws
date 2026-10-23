import { Injectable } from '@nestjs/common';
@Injectable()
export class BookingMetrics {
  private successful = 0;
  private failed = 0;
  record(success: boolean) {
    if (success) this.successful++;
    else this.failed++;
  }
  snapshot() {
    return { seatHoldsSucceeded: this.successful, seatHoldsFailed: this.failed };
  }
}
