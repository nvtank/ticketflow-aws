import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX } from '@tixflow/shared';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { MetricsService } from './common/http/metrics.service';
import { requestContext } from './common/http/request-context';
import type { Environment } from './config/environment';

export function configureApplication(app: INestApplication, environment: Environment): void {
  app.setGlobalPrefix(API_PREFIX.slice(1));
  app.use(helmet());
  app.use(cookieParser());
  app.use(requestContext(app.get(MetricsService)));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({ origin: environment.CORS_ORIGINS, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  if (environment.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TixFlow API')
      .setDescription(
        'Local modular monolith. Phase 5: verified PayOS payments, atomic ticket issuance and owned QR tickets.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('tixflow_refresh')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  app.enableShutdownHooks();
}
