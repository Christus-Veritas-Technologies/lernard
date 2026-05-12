import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { User } from '@prisma/client';

interface MagicLinkRecord {
  id: string;
  email: string;
  platform: string;
  expiresAt: Date;
  usedAt: Date | null;
}
import { PrismaService } from '../../prisma/prisma.service';
import {
  toSharedPlan,
  toSharedRole,
} from '../../common/utils/shared-model-mappers';
import { MailService } from './mail.service';

const REFRESH_TOKEN_DAYS = 90;
const MAGIC_LINK_MINUTES = 15;

interface GoogleProfile {
  googleId: string;
  name: string;
  email: string | null;
}

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleUserInfoResponse {
  sub?: string;
  name?: string;
  email?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─── Magic Link ────────────────────────────────────────────────────────────

  async sendMagicLink(email: string, platform: 'web' | 'native' | 'whatsapp' = 'web') {
    const normalizedEmail = email.toLowerCase();

    // Invalidate any previous unused tokens for this address
    await this.prisma.magicLinkToken.updateMany({
      where: { email: normalizedEmail, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = uuidv4();
    const tokenHash = this.hashToken(token);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashToken(otp);

    await this.prisma.magicLinkToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        otpHash,
        platform,
        expiresAt: new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000),
      },
    });

    await this.mailService.sendMagicLink(normalizedEmail, token, otp);

    return { message: 'Check your email for a sign-in link.' };
  }

  async verifyMagicLinkToken(token: string) {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });
    return this.consumeMagicLink(record);
  }

  async verifyMagicLinkOtp(email: string, otp: string) {
    const otpHash = this.hashToken(otp);
    const record = await this.prisma.magicLinkToken.findFirst({
      where: { email: email.toLowerCase(), otpHash, usedAt: null },
    });
    return this.consumeMagicLink(record);
  }

  private async consumeMagicLink(record: MagicLinkRecord | null) {
    if (!record || record.usedAt) {
      throw new UnauthorizedException(
        'This link is invalid or has already been used.',
      );
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'This link has expired. Please request a new one.',
      );
    }

    await this.prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const user = await this.findOrCreateUserByEmail(record.email);
    const tokens = await this.issueTokens(user);
    return { ...tokens, platform: record.platform };
  }

  private async findOrCreateUserByEmail(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.deletedAt)
        throw new UnauthorizedException('Account not found.');
      return existing;
    }
    const newUser = await this.prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        role: 'STUDENT',
      },
    });
    void this.mailService.sendAdminSignupNotification(
      newUser.name ?? newUser.email,
      newUser.email,
      new Date(),
    );
    return newUser;
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  async findOrCreateGoogleUser(profile: GoogleProfile) {
    const { googleId, name, email } = profile;

    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId },
    });
    if (byGoogleId) return this.issueTokens(byGoogleId);

    if (email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (byEmail) {
        const linked = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId },
        });
        return this.issueTokens(linked);
      }
    }

    const created = await this.prisma.user.create({
      data: {
        name,
        email: email
          ? email.toLowerCase()
          : `google-${googleId}@placeholder.lernard`,
        googleId,
        role: 'STUDENT',
      },
    });
    return this.issueTokens(created);
  }

  async loginWithGoogleCode(code: string) {
    const accessToken = await this.exchangeGoogleCodeForAccessToken(code);
    const profile = await this.fetchGoogleProfile(accessToken);
    return this.findOrCreateGoogleUser(profile);
  }

  // ─── Token Management ──────────────────────────────────────────────────────

  async refresh(refreshTokenRaw: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revoked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException(
        'Token reuse detected — all sessions revoked',
      );
    }

    if (stored.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token expired');

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || user.deletedAt) throw new UnauthorizedException();

    const tokens = await this.issueTokens(user);
    const newTokenHash = this.hashToken(tokens.refreshToken);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, replacedByHash: newTokenHash },
    });

    return tokens;
  }

  async logout(userId: string, refreshTokenRaw: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash },
      data: { revoked: true },
    });
  }

  getMe(user: User) {
    return this.serializeAuthUser(user);
  }

  // ─── Guardian PIN ──────────────────────────────────────────────────────────

  async guardianVerifyPassword(userId: string, password: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { userId },
    });

    if (!guardian || !guardian.passwordHash) {
      throw new UnauthorizedException(
        'No parental-controls PIN is set on this account.',
      );
    }

    const bcrypt = await import('bcrypt');
    const valid = await bcrypt.compare(password, guardian.passwordHash);
    if (!valid) throw new UnauthorizedException('Incorrect PIN.');

    return { verified: true };
  }

  // ─── Child Account Activation (Path B setup) ──────────────────────────────

  async activateChildAccount(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { setupToken: token } as any,
    });

    if (!user) {
      throw new BadRequestException('This setup link is invalid or has already been used.');
    }

    const setupTokenExpiresAt = (user as any).setupTokenExpiresAt as Date | null;
    if (!setupTokenExpiresAt || setupTokenExpiresAt < new Date()) {
      throw new BadRequestException('This setup link has expired. Ask your guardian to resend the setup email.');
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        accountStatus: 'ACTIVE',
        setupToken: null,
        setupTokenExpiresAt: null,
      } as any,
    });

    return this.issueTokens(updatedUser);
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async issueTokens(user: User) {
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshTokenRaw = uuidv4();
    const tokenHash = this.hashToken(refreshTokenRaw);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: this.serializeAuthUser(user),
    };
  }

  private serializeAuthUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: toSharedRole(user.role),
      plan: toSharedPlan(user.plan),
      onboardingComplete: user.onboardingComplete,
      firstLookComplete: user.firstLookComplete,
      profilePictureUrl: (user as any).profilePictureUrl ?? null,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async exchangeGoogleCodeForAccessToken(
    code: string,
  ): Promise<string> {
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: 'postmessage',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok)
      throw new UnauthorizedException(
        'Google sign-in failed. Please try again.',
      );

    const json = (await response.json()) as GoogleTokenResponse;
    if (!json.access_token)
      throw new UnauthorizedException(
        'Google sign-in failed. Please try again.',
      );

    return json.access_token;
  }

  private async fetchGoogleProfile(
    accessToken: string,
  ): Promise<GoogleProfile> {
    const response = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok)
      throw new UnauthorizedException('Unable to read Google profile.');

    const json = (await response.json()) as GoogleUserInfoResponse;
    if (!json.sub || !json.name)
      throw new UnauthorizedException('Google profile was incomplete.');

    return { googleId: json.sub, name: json.name, email: json.email ?? null };
  }
}
