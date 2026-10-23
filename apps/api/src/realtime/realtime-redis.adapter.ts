import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server } from 'socket.io';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';
@Injectable()
export class RealtimeRedisAdapter implements OnApplicationShutdown {
  private publisher: Redis | undefined;
  private subscriber: Redis | undefined;
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {}
  async attach(server: Server) {
    const options = {
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 1,
    };
    this.publisher = new Redis(this.env.REDIS_URL, options);
    this.subscriber = this.publisher.duplicate();
    this.publisher.on('error', () => {});
    this.subscriber.on('error', () => {});
    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      server.adapter(createAdapter(this.publisher, this.subscriber));
    } catch {
      this.onApplicationShutdown();
      throw new Error('Configured Socket.IO Redis adapter could not connect.');
    }
  }
  onApplicationShutdown() {
    this.publisher?.disconnect();
    this.subscriber?.disconnect();
  }
}
