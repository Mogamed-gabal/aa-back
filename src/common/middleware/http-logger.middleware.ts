import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpLoggerMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    const requestUrl = request.originalUrl || request.url;

    response.on('finish', (): void => {
      const elapsedMilliseconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      this.logger.log(
        `${request.method} ${requestUrl} ${response.statusCode} ${elapsedMilliseconds.toFixed(2)}ms`,
      );
    });

    next();
  }
}
