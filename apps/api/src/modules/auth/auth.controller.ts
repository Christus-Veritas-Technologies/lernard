import { Controller, Post, Get, Body, Query, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Role } from '@lernard/shared-types';
import { AuthService } from './auth.service';
import { GoogleSessionStore } from './google-session.store';
import type { GoogleSessionData } from './google-session.store';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleCodeDto } from './dto/google-code.dto';
import { GuardianVerifyPasswordDto } from './dto/guardian-verify-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleSessionStore: GoogleSessionStore,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('google/code')
  async loginWithGoogleCode(@Body() dto: GoogleCodeDto) {
    return this.authService.loginWithGoogleCode(dto.code);
  }

  @ProtectedRoute()
  @Post('logout')
  async logout(
    @CurrentUser() user: User,
    @Body() dto: RefreshDto,
  ) {
    await this.authService.logout(user.id, dto.refreshToken);
    return { message: 'Logged out' };
  }

  @ProtectedRoute()
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user);
  }

  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const tokens = req.user as {
        accessToken?: string;
        refreshToken?: string;
        user?: { onboardingComplete: boolean };
      };

      // Validate that tokens were issued
      if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.user) {
        console.error('Google callback: Missing tokens in req.user', { tokens });
        return res.redirect(`${this.configService.get('WEB_APP_URL')}/login?error=auth_failed`);
      }

      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const params = new URLSearchParams(state);
      const client = params.get('client');

      const sessionCode = this.googleSessionStore.create({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        onboardingComplete: tokens.user.onboardingComplete,
      });

      if (client === 'native') {
        // Native still uses hash for deep link compatibility
        const hash = `#accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}&onboardingComplete=${tokens.user.onboardingComplete ? '1' : '0'}`;
        return res.redirect(`lernard://auth/callback${hash}`);
      }

      const webAppUrl = this.configService.getOrThrow<string>('WEB_APP_URL');
      return res.redirect(`${webAppUrl}/google/callback?code=${sessionCode}`);
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(`${this.configService.get('WEB_APP_URL')}/login?error=server_error`);
    }
  }

  @Get('google/session')
  exchangeGoogleSession(@Query('code') code: string): GoogleSessionData {
    if (!code) throw new NotFoundException();
    const session = this.googleSessionStore.consume(code);
    if (!session) throw new NotFoundException('Session expired or invalid');
    return session;
  }

  @Post('apple')
  async apple() {
    // TODO: Implement Apple OAuth
    return { message: 'Not implemented' };
  }

  @ProtectedRoute()
  @Post('migrate-guest')
  async migrateGuest() {
    // TODO: Implement guest migration
    return { message: 'Not implemented' };
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Post('guardian/verify-password')
  async guardianVerifyPassword(
    @CurrentUser() user: User,
    @Body() dto: GuardianVerifyPasswordDto,
  ) {
    return this.authService.guardianVerifyPassword(user.id, dto.password);
  }
}
