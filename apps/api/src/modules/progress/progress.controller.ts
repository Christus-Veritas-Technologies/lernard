import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @ProtectedRoute()
  @Get('overview')
  async getOverview(@CurrentUser() user: User) {
    return this.progressService.getOverview(user.id);
  }

  @ProtectedRoute()
  @Get('subjects')
  async getSubjects(@CurrentUser() user: User) {
    return this.progressService.getSubjects(user.id);
  }

  @ProtectedRoute()
  @Get('subjects/:subjectId')
  async getSubject(
    @CurrentUser() user: User,
    @Param('subjectId') subjectId: string,
  ) {
    return this.progressService.getSubject(user.id, subjectId);
  }

  @ProtectedRoute()
  @Get('growth-areas')
  async getGrowthAreas(@CurrentUser() user: User) {
    return this.progressService.getGrowthAreas(user.id);
  }

  @ProtectedRoute()
  @Delete('growth-areas/:subjectId/:topic')
  async dismissGrowthArea(
    @CurrentUser() user: User,
    @Param('subjectId') subjectId: string,
    @Param('topic') topic: string,
  ) {
    await this.progressService.dismissGrowthArea(user.id, subjectId, decodeURIComponent(topic));
    return { ok: true };
  }

  @ProtectedRoute()
  @Get('summary')
  async getSummary(@CurrentUser() user: User) {
    return this.progressService.getSummary(user.id);
  }

  @ProtectedRoute()
  @Get('history')
  async getHistory(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('subjectName') subjectName?: string,
    @Query('type') type?: 'lesson' | 'quiz',
    @Query('dateFilter') dateFilter?: '7d' | 'month' | '3m' | 'all',
  ) {
    return this.progressService.getHistory(
      user.id,
      cursor,
      subjectName,
      type,
      dateFilter,
    );
  }

  @ProtectedRoute()
  @Delete('reset')
  async resetProgress(@CurrentUser() user: User) {
    await this.progressService.resetProgress(user.id);
    return { ok: true };
  }
}

