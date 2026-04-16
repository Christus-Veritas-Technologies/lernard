import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { GenerateQuizDto, SubmitAnswerDto } from './dto/quizzes.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @ProtectedRoute()
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateQuizDto) {
    return this.quizzesService.generate(user.id, dto);
  }

  @ProtectedRoute()
  @Get(':id')
  async getById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.quizzesService.getById(user.id, id);
  }

  @ProtectedRoute()
  @Post(':id/answer')
  async submitAnswer(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizzesService.submitAnswer(user.id, id, dto);
  }

  @ProtectedRoute()
  @Post(':id/complete')
  async complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.quizzesService.complete(user.id, id);
  }

  @ProtectedRoute()
  @Get('history')
  async getHistory(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.quizzesService.getHistory(user.id, cursor, Math.min(limit!, 50));
  }
}
