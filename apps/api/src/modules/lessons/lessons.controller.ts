import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { R2Service } from '../../r2/r2.service';
import {
  CompleteLessonDto,
  GenerateLessonDto,
  SectionCheckDto,
} from './dto/generate-lesson.dto';
import {
  LessonUploadFile,
  MAX_LESSON_UPLOAD_SIZE,
  storeLessonUpload,
} from './lesson-uploads';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly r2: R2Service,
  ) {}

  @ProtectedRoute()
  @Post('attachments/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_LESSON_UPLOAD_SIZE } }),
  )
  async uploadAttachment(
    @CurrentUser() user: User,
    @UploadedFile() file: LessonUploadFile | undefined,
  ) {
    return storeLessonUpload(this.r2, user.id, file);
  }

  @ProtectedRoute()
  @Get()
  async list(@CurrentUser() user: User) {
    return this.lessonsService.list(user);
  }

  @ProtectedRoute({ planLimit: 'lessons' })
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

  @ProtectedRoute()
  @Sse(':lessonId/stream')
  streamLesson(
    @CurrentUser() user: User,
    @Param('lessonId') lessonId: string,
  ): Observable<MessageEvent> {
    return this.lessonsService.streamLesson(user, lessonId);
  }
}
