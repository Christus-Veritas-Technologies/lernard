import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { GenerateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @ProtectedRoute()
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateQuizDto) {
    return this.quizzesService.generate(user, dto);
  }

  @ProtectedRoute()
  @Get(':quizId')
  async getQuiz(@CurrentUser() user: User, @Param('quizId') quizId: string) {
    return this.quizzesService.getQuiz(user, quizId);
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
}
