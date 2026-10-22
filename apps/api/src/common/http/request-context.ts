import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { MetricsService } from './metrics.service';

export interface ContextRequest extends Request {
  requestId: string;
}

export function requestContext(metrics: MetricsService) {
  const logger = new Logger('HTTP');
  return (request: ContextRequest, response: Response, next: NextFunction): void => {
    const startedAt = performance.now();
    request.requestId = randomUUID();
    response.setHeader('X-Request-ID', request.requestId);
    response.once('finish', () => {
      metrics.recordRequest(response.statusCode);
      // Do not log body, query string, authorization headers or connection URLs.
      logger.log(
        JSON.stringify({
          requestId: request.requestId,
          method: request.method,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        }),
      );
    });
    next();
  };
}
