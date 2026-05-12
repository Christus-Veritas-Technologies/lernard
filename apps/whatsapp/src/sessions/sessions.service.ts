import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { WhatsAppState, WhatsAppStateData } from '@lernard/whatsapp-core';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface StoredSession {
  id: string;
  phoneNumber: string;
  userId: string | null;
  state: string;
  stateData: Record<string, unknown> | null;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma = new PrismaClient();
  private readonly logger = new Logger(SessionsService.name);
  private readonly encKey: Buffer;

  constructor() {
    const keyHex = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY ?? '';
    if (keyHex.length !== 64) {
      this.logger.warn(
        'WHATSAPP_TOKEN_ENCRYPTION_KEY is missing or not 64 hex chars. ' +
          'Token storage will be insecure in development mode.',
      );
    }
    // Pad or truncate to 32 bytes so the app boots even without a real key
    const padded = keyHex.padEnd(64, '0').slice(0, 64);
    this.encKey = Buffer.from(padded, 'hex');
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async getOrCreate(phoneNumber: string): Promise<StoredSession> {
    const existing = await this.prisma.whatsAppSession.findUnique({
      where: { phoneNumber },
    });
    if (existing) return existing as StoredSession;

    return this.prisma.whatsAppSession.create({
      data: { phoneNumber },
    }) as Promise<StoredSession>;
  }

  async setState(
    phoneNumber: string,
    state: WhatsAppState,
    stateData?: WhatsAppStateData | null,
  ): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { phoneNumber },
      data: {
        state: state as string,
        stateData: stateData !== undefined ? (stateData as object) : undefined,
      },
    });
  }

  async setUserId(phoneNumber: string, userId: string): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { phoneNumber },
      data: { userId },
    });
  }

  async saveTokens(
    phoneNumber: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { phoneNumber },
      data: {
        accessTokenEnc: this.encrypt(accessToken),
        refreshTokenEnc: this.encrypt(refreshToken),
      },
    });
  }

  async getTokens(
    phoneNumber: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { phoneNumber },
      select: { accessTokenEnc: true, refreshTokenEnc: true },
    });
    if (!session?.accessTokenEnc || !session?.refreshTokenEnc) return null;
    return {
      accessToken: this.decrypt(session.accessTokenEnc),
      refreshToken: this.decrypt(session.refreshTokenEnc),
    };
  }

  async clearTokens(phoneNumber: string): Promise<void> {
    await this.prisma.whatsAppSession.update({
      where: { phoneNumber },
      data: {
        accessTokenEnc: null,
        refreshTokenEnc: null,
        userId: null,
        state: 'UNAUTHENTICATED',
        stateData: null,
      },
    });
  }

  async updateStateData(
    phoneNumber: string,
    patch: Partial<Record<string, unknown>>,
  ): Promise<void> {
    const existing = await this.prisma.whatsAppSession.findUnique({
      where: { phoneNumber },
      select: { stateData: true },
    });
    const current = (existing?.stateData as Record<string, unknown>) ?? {};
    await this.prisma.whatsAppSession.update({
      where: { phoneNumber },
      data: { stateData: { ...current, ...patch } },
    });
  }

  // ─── Encryption helpers ────────────────────────────────────────────────────

  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // Format: iv(hex):tag(hex):ciphertext(hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(stored: string): string {
    const [ivHex, tagHex, ctHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, this.encKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct) + decipher.final('utf8');
  }
}
