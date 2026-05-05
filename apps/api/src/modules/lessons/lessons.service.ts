import { Injectable, NotFoundException } from '@nestjs/common';
import type { LessonContent, PostLessonResult } from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { CompleteLessonDto, GenerateLessonDto, SectionCheckDto } from './dto/generate-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
  ) {}

  async generate(user: User, dto: GenerateLessonDto): Promise<{ lessonId: string; status: string }> {
    const generated = await this.mastraService.generateLesson({
      topic: dto.topic,
      depth: dto.depth,
      subjectName: dto.subject,
    });

    await validateGeneratedContent(generated, this.mastraService);

    const lesson = await (this.prisma as any).lesson.create({
      data: {
        userId: user.id,
        topic: generated.topic,
        depth: generated.depth,
        status: 'READY',
        estimatedMinutes: generated.estimatedMinutes,
        sections: generated.sections,
      },
    });

    return { lessonId: lesson.id, status: 'ready' };
  }

  async getLesson(user: User, lessonId: string): Promise<{ status: 'generating' | 'ready'; content?: LessonContent }> {
    const lesson = await (this.prisma as any).lesson.findFirst({
      where: { id: lessonId, userId: user.id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.status !== 'READY') {
      return { status: 'generating' };
    }

    return {
      status: 'ready',
      content: {
        lessonId: lesson.id,
        topic: lesson.topic,
        subjectName: lesson.subjectName ?? 'General',
        depth: normalizeDepth(lesson.depth),
        estimatedMinutes: lesson.estimatedMinutes,
        sections: Array.isArray(lesson.sections) ? lesson.sections : [],
      },
    };
  }

  async sectionCheck(user: User, lessonId: string, dto: SectionCheckDto): Promise<{ ok: true }> {
    const lesson = await (this.prisma as any).lesson.findFirst({
      where: { id: lessonId, userId: user.id },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await (this.prisma as any).lesson.update({
      where: { id: lessonId },
      data: {
        sectionChecks: {
          push: {
            response: dto.response,
            note: dto.note ?? null,
            createdAt: new Date().toISOString(),
          },
        },
      },
    });

    return { ok: true };
  }

  async complete(user: User, lessonId: string, dto: CompleteLessonDto): Promise<PostLessonResult> {
    const lesson = await (this.prisma as any).lesson.findFirst({
      where: { id: lessonId, userId: user.id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await (this.prisma as any).lesson.update({
      where: { id: lessonId },
      data: {
        completedAt: new Date(),
      },
    });

    await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        sessionCount: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });

    await (this.prisma as any).session.create({
      data: {
        userId: user.id,
        type: 'LESSON',
        lessonId,
        topic: lesson.topic,
        subjectName: lesson.subjectName ?? null,
        durationMinutes: lesson.estimatedMinutes,
      },
    });

    return {
      lessonId,
      xpEarned: 20 + dto.confidenceRating,
      recapBullets: [
        `You completed a lesson on ${lesson.topic}.`,
        `Your confidence rating: ${dto.confidenceRating}/5.`,
        'Keep your momentum with a quick quiz next.',
      ],
    };
  }
}

function normalizeDepth(depth: string): 'quick' | 'standard' | 'deep' {
  if (depth === 'quick' || depth === 'standard' || depth === 'deep') {
    return depth;
  }
  return 'standard';
}
