import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
  };
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const requestId = this.resolveRequestId(req.headers['x-request-id']);
    const method = req.method;
    const path = req.originalUrl || req.url;
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    const ipAddress = this.resolveIpAddress(req);

    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const statusCode = res.statusCode;
      const userId = req.user?.id ?? null;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      const payload = {
        message: 'HTTP request completed',
        requestId,
        method,
        path,
        statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        userId,
        ipAddress,
        userAgent,
      };

      this.logger[level](JSON.stringify(payload));
    });

    next();
  }

  private resolveRequestId(headerValue: string | string[] | undefined): string {
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    if (Array.isArray(headerValue) && headerValue[0]?.trim()) {
      return headerValue[0].trim();
    }

    return randomUUID();
  }

  private resolveIpAddress(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    }

    return req.ip ?? 'unknown';
  }
}
