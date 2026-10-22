import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import type { DependencyStatus, HealthResponse } from '@tixflow/shared';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';

@Injectable()
export class HealthService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private checking: Promise<HealthResponse> | undefined;

  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {
    this.pool = new Pool({
      connectionString: environment.DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 1500,
      query_timeout: 1500,
      idleTimeoutMillis: 1000,
    });
    this.pool.on('error', () => {
      /* Report availability through readiness without exposing credentials. */
    });
  }

  async check(): Promise<HealthResponse> {
    // Coalesce simultaneous probes without caching a fabricated dependency state.
    this.checking ??= this.probe().finally(() => {
      this.checking = undefined;
    });
    return this.checking;
  }

  private async probe(): Promise<HealthResponse> {
    const outcomes = await Promise.allSettled([this.pool.query('SELECT 1'), this.pingRedis()]);
    const postgres: DependencyStatus = outcomes[0]?.status === 'fulfilled' ? 'up' : 'down';
    const redis: DependencyStatus = outcomes[1]?.status === 'fulfilled' ? 'up' : 'down';
    return {
      status: postgres === 'up' && redis === 'up' ? 'ok' : 'degraded',
      service: 'tixflow-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies: { postgres, redis },
    };
  }

  private async pingRedis(): Promise<void> {
    const redis = new Redis(this.environment.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 1500,
      commandTimeout: 1500,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {
      /* Driver errors may contain connection details. */
    });
    try {
      await redis.connect();
      const pong = await redis.ping();
      if (pong !== 'PONG') throw new Error('Redis probe failed');
    } finally {
      redis.disconnect();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
