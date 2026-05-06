import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

interface AuthenticatedRequest extends Request {
  user?: { id?: string; role?: string };
}

// ─── ANSI colour helpers (dev only) ─────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function methodColor(method: string): string {
  const map: Record<string, string> = {
    GET: c.green,
    POST: c.cyan,
    PUT: c.yellow,
    PATCH: c.magenta,
    DELETE: c.red,
  };
  return map[method] ?? c.white;
}

function statusColor(code: number): string {
  if (code >= 500) return c.red;
  if (code >= 400) return c.yellow;
  if (code >= 300) return c.cyan;
  return c.green;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly isDev = process.env.NODE_ENV !== 'production';

  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    const requestId = this.resolveRequestId(req.headers['x-request-id']);
    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = this.resolveIp(req);

    res.setHeader('x-request-id', requestId);

    // Log the incoming request immediately (useful for debugging hung requests)
    if (this.isDev) {
      const bodyStr = this.summariseBody(req.body);
      const bodyPart = bodyStr ? `${c.gray}  ${bodyStr}${c.reset}` : '';
      this.logger.log(
        `${c.bold}${methodColor(method)}${method}${c.reset} ${c.white}${path}${c.reset}${bodyPart}`,
      );
    }

    res.on('finish', () => {
      const ms = (Number(process.hrtime.bigint() - start) / 1_000_000).toFixed(1);
      const status = res.statusCode;
      const userId = req.user?.id ?? null;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';

      if (this.isDev) {
        const statusStr = `${statusColor(status)}${c.bold}${status}${c.reset}`;
        const timeStr = `${c.gray}${ms}ms${c.reset}`;
        const userStr = userId ? `${c.gray}user:${userId.slice(0, 8)}${c.reset}` : '';
        const parts = [statusStr, timeStr, userStr].filter(Boolean).join('  ');
        this.logger[level](
          `${c.bold}${methodColor(method)}${method}${c.reset} ${c.white}${path}${c.reset}  ${parts}`,
        );
      } else {
        // Production: structured JSON for log aggregators
        this.logger[level](
          JSON.stringify({
            requestId,
            method,
            path,
            status,
            ms: Number(ms),
            userId,
            ip,
          }),
        );
      }
    });

    next();
  }

  /** Redact sensitive fields and truncate large bodies. */
  private summariseBody(body: unknown): string {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return '';

    const sensitive = new Set(['password', 'token', 'otp', 'refreshToken', 'accessToken', 'code']);
    const redacted: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      redacted[k] = sensitive.has(k) ? '[redacted]' : v;
    }

    const str = JSON.stringify(redacted);
    return str.length > 200 ? str.slice(0, 200) + '…' : str;
  }

  private resolveRequestId(header: string | string[] | undefined): string {
    if (typeof header === 'string' && header.trim()) return header.trim();
    if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
    return randomUUID();
  }

  private resolveIp(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    return req.ip ?? 'unknown';
  }
}
