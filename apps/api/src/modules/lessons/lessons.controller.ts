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
import { LessonsService } from './lessons.service';
import { GenerateLessonDto, SectionCheckDto } from './dto/lessons.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @ProtectedRoute()
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateLessonDto) {
    return this.lessonsService.generate(user.id, dto);
  }

  @ProtectedRoute()
  @Get(':id')
  async getById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.lessonsService.getById(user.id, id);
  }

  @ProtectedRoute()
  @Post(':id/section-check')
  async sectionCheck(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SectionCheckDto,
  ) {
    return this.lessonsService.sectionCheck(user.id, id, dto);
  }

  @ProtectedRoute()
  @Post(':id/complete')
  async complete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.lessonsService.complete(user.id, id);
  }

  @ProtectedRoute()
  @Get('history')
  async getHistory(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.lessonsService.getHistory(user.id, cursor, Math.min(limit!, 50));
  }
}
