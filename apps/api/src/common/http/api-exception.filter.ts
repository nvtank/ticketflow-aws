import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ApiError } from '@tixflow/shared';
import type { Response } from 'express';
import type { ContextRequest } from './request-context';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<ContextRequest>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const candidate: unknown =
      typeof body === 'object' && body !== null && 'message' in body ? body.message : body;
    const details = Array.isArray(candidate)
      ? candidate.filter((value): value is string => typeof value === 'string')
      : undefined;
    const message =
      status >= 500
        ? 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.'
        : typeof candidate === 'string'
          ? candidate
          : (details?.[0] ?? 'Yêu cầu không hợp lệ.');
    if (status >= 500)
      this.logger.error(JSON.stringify({ requestId: request.requestId, statusCode: status }));
    const payload: ApiError = {
      statusCode: status,
      code: status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`,
      message,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      ...(details && status < 500 ? { details } : {}),
    };
    response.status(status).json(payload);
  }
}
