import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import {
  CheckPlanLimit,
  PlanLimitsGuard,
} from '../../common/guards/plan-limits.guard';
import {
  CompleteLessonDto,
  GenerateLessonDto,
  SectionCheckDto,
} from './dto/generate-lesson.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @ProtectedRoute()
  @Get()
  async list(@CurrentUser() user: User) {
    return this.lessonsService.list(user);
  }

  @ProtectedRoute()
  @UseGuards(PlanLimitsGuard)
  @CheckPlanLimit('lessons')
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateLessonDto) {
    return this.lessonsService.generate(user, dto);
  }

  @ProtectedRoute()
  @Get(':lessonId')
  async getLesson(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
  ) {
    return this.lessonsService.getLesson(user, lessonId);
  }

  @ProtectedRoute()
  @Post(':lessonId/section-check')
  async sectionCheck(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
    @Body() dto: SectionCheckDto,
  ) {
    return this.lessonsService.sectionCheck(user, lessonId, dto);
  }

  @ProtectedRoute()
  @Post(':lessonId/reexplain')
  async reexplainSection(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
    @Query('sectionIndex', ParseIntPipe) sectionIndex: number,
  ) {
    return this.lessonsService.reexplainSection(user, lessonId, sectionIndex);
  }

  @ProtectedRoute()
  @Post(':lessonId/complete')
  async complete(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.lessonsService.complete(user, lessonId, dto);
  }
}
