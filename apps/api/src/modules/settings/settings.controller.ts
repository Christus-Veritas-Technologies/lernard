import { Controller, Get, Patch, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { PagePayload, SettingsContent } from '@lernard/shared-types';
import { SettingsService } from './settings.service';
import {
  UpdateModeDto,
  CompanionControlsDto,
  UpdateAppearanceDto,
  UpdateDailyGoalDto,
} from './dto/settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export interface AvatarUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ProtectedRoute()
  @Get('payload')
  async getPayload(@CurrentUser() user: User): Promise<PagePayload<SettingsContent>> {
    return this.settingsService.getPayload(user.id);
  }

  @ProtectedRoute()
  @Get()
  async get(@CurrentUser() user: User) {
    return this.settingsService.get(user.id);
  }

  @ProtectedRoute({ settingsLock: true })
  @Patch('mode')
  async updateMode(@CurrentUser() user: User, @Body() dto: UpdateModeDto) {
    return this.settingsService.updateMode(user.id, dto.mode);
  }

  @ProtectedRoute({ settingsLock: true })
  @Patch('companion-controls')
  async updateCompanionControls(
    @CurrentUser() user: User,
    @Body() dto: CompanionControlsDto,
  ) {
    return this.settingsService.updateCompanionControls(user.id, dto);
  }

  @ProtectedRoute({ settingsLock: true })
  @Patch('appearance')
  async updateAppearance(@CurrentUser() user: User, @Body() dto: UpdateAppearanceDto) {
    return this.settingsService.updateAppearance(user.id, dto.appearance);
  }

  @ProtectedRoute({ settingsLock: true })
  @Patch('daily-goal')
  async updateDailyGoal(@CurrentUser() user: User, @Body() dto: UpdateDailyGoalDto) {
    return this.settingsService.updateDailyGoal(user.id, dto.dailyTarget);
  }

  @ProtectedRoute()
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_SIZE } }))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: AvatarUploadFile | undefined,
  ) {
    return this.settingsService.uploadAvatar(user.id, file);
  }
}
