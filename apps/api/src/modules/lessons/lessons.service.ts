import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { LessonContent, PostLessonResult } from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { StudentContextBuilder } from '../../mastra/student-context.builder';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import {
  CompleteLessonDto,
  GenerateLessonDto,
  SectionCheckDto,
} from './dto/generate-lesson.dto';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
    private readonly studentContextBuilder: StudentContextBuilder,
  ) {}

  async generate(
    user: User,
    dto: GenerateLessonDto,
  ): Promise<{ lessonId: string; status: string }> {
    const startedAt = Date.now();
    const idempotencyKeyShort = dto.idempotencyKey.slice(0, 8);
    const subject = dto.subject ?? 'General';
    const topicPreview = dto.topic.trim().slice(0, 80);
    let stage = 'build_student_context';

    this.logger.log(
      `[lesson.generate] start userId=${user.id} key=${idempotencyKeyShort} depth=${dto.depth} subject="${subject}" topic="${topicPreview}"`,
    );

    try {
      const contextStartedAt = Date.now();
      const studentContext = await this.studentContextBuilder.buildForUser(
        user.id,
      );
      this.logger.log(
        `[lesson.generate] context_ready userId=${user.id} key=${idempotencyKeyShort} durationMs=${Date.now() - contextStartedAt}`,
      );

      stage = 'generate_lesson';
      const generateStartedAt = Date.now();
      const generated = await this.mastraService.generateLesson({
        topic: dto.topic,
        depth: dto.depth,
        subjectName: dto.subject,
        studentContext,
        remediationContext: dto.remediationContext,
        retryContext: dto.retryContext,
      });
      this.logger.log(
        `[lesson.generate] generated userId=${user.id} key=${idempotencyKeyShort} sections=${generated.sections.length} estimatedMinutes=${generated.estimatedMinutes} durationMs=${Date.now() - generateStartedAt}`,
      );

      stage = 'validate_generated_content';
      const validateStartedAt = Date.now();
      await validateGeneratedContent(generated, this.mastraService);
      this.logger.log(
        `[lesson.generate] validated userId=${user.id} key=${idempotencyKeyShort} durationMs=${Date.now() - validateStartedAt}`,
      );

      stage = 'persist_lesson';
      const persistStartedAt = Date.now();
      const lesson = await (this.prisma as any).lesson.create({
        data: {
          userId: user.id,
          topic: generated.topic,
          subjectName: generated.subjectName,
          depth: generated.depth,
          status: 'READY',
          estimatedMinutes: generated.estimatedMinutes,
          sections: generated.sections,
        },
      });
      this.logger.log(
        `[lesson.generate] persisted userId=${user.id} key=${idempotencyKeyShort} lessonId=${lesson.id} durationMs=${Date.now() - persistStartedAt}`,
      );

      this.logger.log(
        `[lesson.generate] success userId=${user.id} key=${idempotencyKeyShort} lessonId=${lesson.id} totalMs=${Date.now() - startedAt}`,
      );

      return { lessonId: lesson.id, status: 'ready' };
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `[lesson.generate] failed userId=${user.id} key=${idempotencyKeyShort} stage=${stage} totalMs=${Date.now() - startedAt} error="${message}"`,
        stack,
      );

      throw error;
    }
  }

  async list(user: User): Promise<
    {
      lessonId: string;
      topic: string;
      subjectName: string;
      completedAt: string | null;
    }[]
  > {
    const lessons = await (this.prisma as any).lesson.findMany({
      where: { userId: user.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, topic: true, subjectName: true, completedAt: true },
    });

    return lessons.map(
      (l: {
        id: string;
        topic: string;
        subjectName: string | null;
        completedAt: Date | null;
      }) => ({
        lessonId: l.id,
        topic: l.topic,
        subjectName: l.subjectName ?? 'General',
        completedAt: l.completedAt ? l.completedAt.toISOString() : null,
      }),
    );
  }

  async getLesson(
    user: User,
    lessonId: string,
  ): Promise<{ status: 'generating' | 'ready'; content?: LessonContent }> {
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

  async sectionCheck(
    user: User,
    lessonId: string,
    dto: SectionCheckDto,
  ): Promise<{ ok: true }> {
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

  async reexplainSection(
    user: User,
    lessonId: string,
    sectionIndex: number,
  ): Promise<{ sectionIndex: number; section: LessonContent['sections'][number] }> {
    const lesson = await (this.prisma as any).lesson.findFirst({
      where: { id: lessonId, userId: user.id },
      select: {
        id: true,
        topic: true,
        subjectName: true,
        depth: true,
        sections: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const sections = Array.isArray(lesson.sections)
      ? (lesson.sections as LessonContent['sections'])
      : [];

    if (sectionIndex < 0 || sectionIndex >= sections.length) {
      throw new NotFoundException('Section not found');
    }

    const section = sections[sectionIndex];
    const studentContext = await this.studentContextBuilder.buildForUser(
      user.id,
    );

    const replacementBody = await this.mastraService.reexplainLessonSection({
      topic: lesson.topic,
      subjectName: lesson.subjectName ?? 'General',
      depth: normalizeDepth(lesson.depth),
      sectionType: section.type,
      sectionHeading: section.heading,
      originalBody: section.body,
      studentContext,
    });

    const updatedSections = sections.map((item, idx) =>
      idx === sectionIndex
        ? {
            ...item,
            body: replacementBody,
            heading: item.heading ?? 'Another way to look at it',
          }
        : item,
    );

    await (this.prisma as any).lesson.update({
      where: { id: lessonId },
      data: { sections: updatedSections },
    });

    return {
      sectionIndex,
      section: updatedSections[sectionIndex],
    };
  }

  async complete(
    user: User,
    lessonId: string,
    dto: CompleteLessonDto,
  ): Promise<PostLessonResult> {
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
        confidenceRating: dto.confidenceRating,
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
