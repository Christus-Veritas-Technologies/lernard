import { Controller, Post, Get, Body } from '@nestjs/common';
import { Role } from '@lernard/shared-types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GuardianVerifyPasswordDto } from './dto/guardian-verify-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('google')
  async google() {
    // TODO: Implement Google OAuth
    return { message: 'Not implemented' };
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
