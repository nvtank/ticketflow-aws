import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';
import { parseEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const app = await NestFactory.create(AppModule);
  configureApplication(app, environment);
  await app.listen(environment.API_PORT, '127.0.0.1');
  Logger.log(`TixFlow API: http://localhost:${environment.API_PORT}/api/v1`, 'Bootstrap');
}

void bootstrap().catch(() => {
  // Avoid printing connection strings or credentials from driver exceptions.
  Logger.error('API startup failed. Check configuration and local dependencies.', 'Bootstrap');
  process.exitCode = 1;
});
