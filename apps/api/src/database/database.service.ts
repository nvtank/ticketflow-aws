import { Inject, Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { ENVIRONMENT } from '../config/configuration.module';
import type { Environment } from '../config/environment';

@Injectable()
export class DatabaseService extends PrismaClient implements OnApplicationShutdown {
  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    super({
      adapter: new PrismaPg({
        connectionString: environment.DATABASE_URL,
        connectionTimeoutMillis: 2000,
        max: 10,
      }),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
