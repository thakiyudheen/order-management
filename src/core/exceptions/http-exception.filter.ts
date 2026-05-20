import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AppLogger } from '../../lib/logger/app-logger.service';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new AppLogger();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseRecord = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseRecord.message)) {
          message = responseRecord.message.join(', ');
        } else if (typeof responseRecord.message === 'string') {
          message = responseRecord.message;
        } else {
          message = JSON.stringify(exceptionResponse);
        }
      } else {
        message = String(exceptionResponse);
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'A database error occurred';

      this.logger.error(
        `Database Query Failed: ${exception.message}`,
        exception.stack,
        'DatabaseExceptionFilter',
      );
    } else {
      const err =
        exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `Unhandled error at [${request.method}] ${request.url}: ${err.message}`,
        err.stack || String(err),
        'AllExceptionsFilter',
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
