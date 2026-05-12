import { Injectable, Logger } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { ROUTES } from '@lernard/routes';

export class PlanLimitError extends Error {
  constructor(
    public readonly limitType: string,
    public readonly resetAt: string | null,
    public readonly resource: 'lessons' | 'quizzes' | 'projects' | 'chatMessages',
  ) {
    super(`Plan limit reached: ${limitType}`);
  }
}

export class AuthExpiredError extends Error {
  constructor() {
    super('Authentication tokens have expired or been revoked.');
  }
}

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: string;
  /** If true, do not send Authorization header */
  skipAuth?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class LernardApiService {
  private readonly logger = new Logger(LernardApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly sessions: SessionsService) {
    this.baseUrl = (process.env.LERNARD_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  // ─── Core fetch ────────────────────────────────────────────────────────────

  async call<T>(
    phoneNumber: string,
    path: string,
    options: ApiCallOptions = {},
  ): Promise<T> {
    const tokens = options.skipAuth ? null : await this.sessions.getTokens(phoneNumber);

    const response = await this.fetch(path, tokens?.accessToken ?? null, options);

    // 401 → try to refresh once
    if (response.status === 401 && tokens?.refreshToken) {
      const refreshed = await this.tryRefresh(phoneNumber, tokens.refreshToken);
      if (!refreshed) throw new AuthExpiredError();
      const retried = await this.fetch(path, refreshed.accessToken, options);
      return this.parseResponse<T>(retried, path);
    }

    return this.parseResponse<T>(response, path);
  }

  /** Make an unauthenticated API call (e.g. for auth flow) */
  async callPublic<T>(
    path: string,
    options: Omit<ApiCallOptions, 'skipAuth'> = {},
  ): Promise<T> {
    const response = await this.fetch(path, null, { ...options, skipAuth: true });
    return this.parseResponse<T>(response, path);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async fetch(
    path: string,
    accessToken: string | null,
    options: ApiCallOptions,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return globalThis.fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
    });
  }

  private async parseResponse<T>(response: Response, path: string): Promise<T> {
    if (response.status === 429) {
      let body: Record<string, unknown> = {};
      try {
        body = await response.json() as Record<string, unknown>;
      } catch {
        // ignore
      }
      const resource = this.inferResource(path);
      throw new PlanLimitError(
        (body['limitType'] as string) ?? 'unknown',
        (body['resetAt'] as string) ?? null,
        resource,
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        const json = await response.json() as Record<string, unknown>;
        errorText = (json['message'] as string) ?? JSON.stringify(json);
      } catch {
        errorText = await response.text();
      }
      throw new Error(`API ${response.status} on ${path}: ${errorText}`);
    }

    try {
      return await response.json() as T;
    } catch {
      return null as unknown as T;
    }
  }

  private async tryRefresh(
    phoneNumber: string,
    refreshToken: string,
  ): Promise<{ accessToken: string } | null> {
    try {
      const res = await globalThis.fetch(`${this.baseUrl}${ROUTES.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json() as RefreshResponse;
      await this.sessions.saveTokens(phoneNumber, data.accessToken, data.refreshToken);
      return { accessToken: data.accessToken };
    } catch {
      return null;
    }
  }

  private inferResource(
    path: string,
  ): 'lessons' | 'quizzes' | 'projects' | 'chatMessages' {
    if (path.includes('/lessons')) return 'lessons';
    if (path.includes('/quizzes')) return 'quizzes';
    if (path.includes('/projects')) return 'projects';
    return 'chatMessages';
  }
}
