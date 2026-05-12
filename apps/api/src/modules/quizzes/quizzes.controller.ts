import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import {
  CheckPlanLimit,
  PlanLimitsGuard,
} from '../../common/guards/plan-limits.guard';
import { R2Service } from '../../r2/r2.service';
import {
  EvaluateShortAnswerDto,
  GenerateQuizDto,
  SubmitAnswerDto,
  AnswerPartDto,
  QuizHistoryQueryDto,
} from './dto/quizzes.dto';
import {
  MAX_QUIZ_UPLOAD_SIZE,
  QuizUploadFile,
  storeQuizUpload,
} from './quiz-uploads';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly r2: R2Service,
  ) {}

  @ProtectedRoute()
  @Post('attachments/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_QUIZ_UPLOAD_SIZE } }),
  )
  async uploadAttachment(
    @CurrentUser() user: User,
    @UploadedFile() file: QuizUploadFile | undefined,
  ) {
    return storeQuizUpload(this.r2, user.id, file);
  }

  @ProtectedRoute()
  @UseGuards(PlanLimitsGuard)
  @CheckPlanLimit('quizzes')
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateQuizDto) {
    return this.quizzesService.generate(user, dto);
  }

  @ProtectedRoute()
  @Get('dashboard-stats')
  async getDashboardStats(@CurrentUser() user: User) {
    return this.quizzesService.getDashboardStats(user);
  }

  @ProtectedRoute()
  @Get('history')
  async getHistory(
    @CurrentUser() user: User,
    @Query() query: QuizHistoryQueryDto,
  ) {
    return this.quizzesService.getHistory(user, query);
  }

  @ProtectedRoute()
  @Get(':quizId/status')
  async getStatus(@CurrentUser() user: User, @Param('quizId') quizId: string) {
    return this.quizzesService.getQuizStatus(user, quizId);
  }

  @ProtectedRoute()
  @Get(':quizId')
  async getQuiz(@CurrentUser() user: User, @Param('quizId') quizId: string) {
    return this.quizzesService.getQuiz(user, quizId);
  }

  @ProtectedRoute()
  @Get(':quizId/remediation-context')
  async getRemediationContext(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
  ) {
    return this.quizzesService.getRemediationContext(user, quizId);
  }

  @ProtectedRoute()
  @Post(':quizId/answer')
  async answer(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizzesService.answer(user, quizId, dto);
  }

  @ProtectedRoute()
  @Post(':quizId/complete')
  async complete(@CurrentUser() user: User, @Param('quizId') quizId: string) {
    return this.quizzesService.complete(user, quizId);
  }

  @ProtectedRoute()
  @Post(':quizId/evaluate-short-answer')
  async evaluateShortAnswer(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
    @Body() dto: EvaluateShortAnswerDto,
  ) {
    return this.quizzesService.evaluateShortAnswer(user, quizId, dto);
  }

  @ProtectedRoute()
  @Post(':quizId/answer-part')
  async answerPart(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
    @Body() dto: AnswerPartDto,
  ) {
    return this.quizzesService.answerPart(user, quizId, dto);
  }

  @ProtectedRoute()
  @Sse(':quizId/stream')
  streamQuiz(
    @CurrentUser() user: User,
    @Param('quizId') quizId: string,
  ): Observable<MessageEvent> {
    return this.quizzesService.streamQuiz(user, quizId);
  }
}
