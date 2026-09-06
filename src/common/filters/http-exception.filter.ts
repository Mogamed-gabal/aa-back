import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const INTERNAL_SERVER_ERROR_STATUS = 500;

interface ErrorResponseBody {
  readonly success: false;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly path: string;
  readonly message: string | readonly string[];
  readonly details?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isHttpException || statusCode >= INTERNAL_SERVER_ERROR_STATUS) {
      this.logUnexpectedException(exception, request);
    }

    const errorResponse = this.buildErrorResponse(
      exception,
      statusCode,
      request,
      isProduction,
    );

    response.status(statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    statusCode: number,
    request: Request,
    isProduction: boolean,
  ): ErrorResponseBody {
    const isHttpException = exception instanceof HttpException;
    const shouldHideDetails =
      isProduction && statusCode >= INTERNAL_SERVER_ERROR_STATUS;

    if (shouldHideDetails || !isHttpException) {
      return {
        success: false,
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.originalUrl || request.url,
        message: 'Internal server error',
      };
    }

    const exceptionResponse: unknown = exception.getResponse();
    const message = this.extractMessage(exceptionResponse);
    const details = this.extractDetails(exceptionResponse);

    return {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      message,
      ...(details !== undefined ? { details } : {}),
    };
  }

  private extractMessage(value: unknown): string | readonly string[] {
    if (typeof value === 'string') {
      return value;
    }

    if (isRecord(value)) {
      const message = value.message;

      if (typeof message === 'string') {
        return message;
      }

      if (
        Array.isArray(message) &&
        message.every(
          (item: unknown): item is string => typeof item === 'string',
        )
      ) {
        return message;
      }
    }

    return 'Request failed';
  }

  private extractDetails(value: unknown): unknown {
    if (!isRecord(value)) {
      return undefined;
    }

    return value.error;
  }

  private logUnexpectedException(exception: unknown, request: Request): void {
    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown exception';
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `${request.method} ${request.originalUrl || request.url} - ${errorMessage}`,
      stack,
    );
  }
}
