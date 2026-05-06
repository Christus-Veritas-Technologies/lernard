import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSharedPlan, toSharedRole } from '../../common/utils/shared-model-mappers';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_DAYS = 90;

interface GoogleProfile {
  googleId: string;
  name: string;
  email: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: dto.name,
          email: normalizedEmail,
          passwordHash,
          role: dto.accountType === 'guardian' ? 'GUARDIAN' : 'STUDENT',
          ...(dto.accountType === 'guardian' ? { onboardingComplete: true } : {}),
        },
      });

      if (dto.accountType === 'guardian') {
        await transaction.guardian.create({
          data: {
            userId: createdUser.id,
            passwordHash,
          },
        });
      }

      return createdUser;
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async findOrCreateGoogleUser(profile: GoogleProfile) {
    const { googleId, name, email } = profile;

    // 1. Existing user with this googleId
    const byGoogleId = await this.prisma.user.findUnique({ where: { googleId } });
    if (byGoogleId) {
      return this.issueTokens(byGoogleId);
    }

    // 2. Existing user with same email — link the account
    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (byEmail) {
        const linked = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId },
        });
        return this.issueTokens(linked);
      }
    }

    // 3. Brand-new user
    const created = await this.prisma.user.create({
      data: {
        name,
        email: email ? email.toLowerCase() : `google-${googleId}@placeholder.lernard`,
        googleId,
        role: 'STUDENT',
      },
    });
    return this.issueTokens(created);
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      // Reuse detection — revoke ALL tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old, issue new
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

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

  async guardianVerifyPassword(userId: string, password: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { userId },
    });

    if (!guardian) {
      throw new UnauthorizedException('Guardian account not found');
    }

    const valid = await bcrypt.compare(password, guardian.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect guardian password');
    }

    return { verified: true };
  }

  getMe(user: User) {
    return this.serializeAuthUser(user);
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshTokenRaw = uuidv4();
    const tokenHash = this.hashToken(refreshTokenRaw);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
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
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
