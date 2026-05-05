import { Controller, Post, Get, Body, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Role } from '@lernard/shared-types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GuardianVerifyPasswordDto } from './dto/guardian-verify-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
    const tokens = req.user as {
      accessToken: string;
      refreshToken: string;
      user: { onboardingComplete: boolean };
    };

    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const params = new URLSearchParams(state);
    const client = params.get('client');

    const hash = `#accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}&onboardingComplete=${tokens.user.onboardingComplete ? '1' : '0'}`;

    if (client === 'native') {
      return res.redirect(`lernard://auth/callback${hash}`);
    }

    const webAppUrl = this.configService.getOrThrow<string>('WEB_APP_URL');
    return res.redirect(`${webAppUrl}/google/callback${hash}`);
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
