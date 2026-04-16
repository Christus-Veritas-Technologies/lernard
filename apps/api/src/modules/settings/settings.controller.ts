import { Controller, Get, Patch, Body } from '@nestjs/common';
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

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ProtectedRoute()
  @Get()
  async get(@CurrentUser() user: User) {
    return this.settingsService.get(user.id);
  }

  @ProtectedRoute()
  @Patch('mode')
  async updateMode(@CurrentUser() user: User, @Body() dto: UpdateModeDto) {
    return this.settingsService.updateMode(user.id, dto.mode);
  }

  @ProtectedRoute()
  @Patch('companion-controls')
  async updateCompanionControls(
    @CurrentUser() user: User,
    @Body() dto: CompanionControlsDto,
  ) {
    return this.settingsService.updateCompanionControls(user.id, dto);
  }

  @ProtectedRoute()
  @Patch('appearance')
  async updateAppearance(@CurrentUser() user: User, @Body() dto: UpdateAppearanceDto) {
    return this.settingsService.updateAppearance(user.id, dto.appearance);
  }

  @ProtectedRoute()
  @Patch('daily-goal')
  async updateDailyGoal(@CurrentUser() user: User, @Body() dto: UpdateDailyGoalDto) {
    return this.settingsService.updateDailyGoal(user.id, dto.dailyTarget);
  }
}
