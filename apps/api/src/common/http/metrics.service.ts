import { Global, Module, Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private requests = 0;
  private errors = 0;
  private readonly byStatus = new Map<number, number>();

  recordRequest(statusCode: number): void {
    this.requests += 1;
    if (statusCode >= 400) this.errors += 1;
    this.byStatus.set(statusCode, (this.byStatus.get(statusCode) ?? 0) + 1);
  }

  snapshot() {
    return {
      scope: 'current_api_process' as const,
      uptimeSeconds: Math.floor(process.uptime()),
      httpRequestsTotal: this.requests,
      httpErrorsTotal: this.errors,
      requestsByStatus: Object.fromEntries(this.byStatus),
    };
  }
}

@Global()
@Module({ providers: [MetricsService], exports: [MetricsService] })
export class MetricsModule {}
