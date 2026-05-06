import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface GoogleSession {
  accessToken: string;
  refreshToken: string;
  onboardingComplete: boolean;
  expiresAt: number;
}

const SESSION_TTL_MS = 60_000; // 60 seconds — one-time use only

@Injectable()
export class GoogleSessionStore {
  private readonly store = new Map<string, GoogleSession>();

  create(data: Omit<GoogleSession, 'expiresAt'>): string {
    const code = randomUUID();
    this.store.set(code, { ...data, expiresAt: Date.now() + SESSION_TTL_MS });
    return code;
  }

  /** Returns session and deletes it (one-time use). Returns null if missing or expired. */
  consume(code: string): Omit<GoogleSession, 'expiresAt'> | null {
    const session = this.store.get(code);
    this.store.delete(code);

    if (!session) return null;
    if (Date.now() > session.expiresAt) return null;

    const { expiresAt: _, ...rest } = session;
    return rest;
  }
}
