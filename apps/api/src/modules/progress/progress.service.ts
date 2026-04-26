import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PagePayload,
  ProgressContent,
  SessionHistoryContent,
  SessionRecord,
  SubjectDetailContent,
  SubjectProgress,
  TopicStrength,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import { listGrowthAreaSnapshots } from '../../common/utils/page-payload-queries';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string): Promise<PagePayload<ProgressContent>> {
    const [user, totalLessons, totalQuizzes, averageSessionLengthMinutes, subjects] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          streakDays: true,
          sessionCount: true,
        },
      }),
      this.prisma.lesson.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
      this.prisma.quiz.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
      this.getAverageSessionLengthMinutes(userId),
      this.getSubjects(userId),
    ]);

    return buildPagePayload(
      {
        streak: user.streakDays,
        xpLevel: calculateXpLevel(user.sessionCount),
        totalLessons,
        totalQuizzes,
        averageSessionLength: averageSessionLengthMinutes,
        subjects,
      },
      {
        permissions: [
          { action: 'can_start_lesson' },
          { action: 'can_take_quiz' },
        ],
      },
    );
  }

  async getSubjects(userId: string): Promise<SubjectProgress[]> {
    const progressRecords = await this.prisma.subjectProgress.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      progressRecords.map(async (progressRecord) => {
        const [totalLessons, totalQuizzes, quizzes] = await Promise.all([
          this.prisma.lesson.count({
            where: {
              userId,
              subjectId: progressRecord.subjectId,
              deletedAt: null,
            },
          }),
          this.prisma.quiz.count({
            where: {
              userId,
              subjectId: progressRecord.subjectId,
              deletedAt: null,
            },
          }),
          this.prisma.quiz.findMany({
            where: {
              userId,
              subjectId: progressRecord.subjectId,
              deletedAt: null,
              completed: true,
              score: { not: null },
            },
            select: {
              score: true,
              length: true,
            },
          }),
        ]);

        const averageScore = quizzes.length
          ? Math.round(
              quizzes.reduce((total, quiz) => {
                const score = quiz.score ?? 0;
                return total + (score / quiz.length) * 100;
              }, 0) / quizzes.length,
            )
          : null;

        return {
          subjectId: progressRecord.subjectId,
          subjectName: progressRecord.subject.name,
          strengthLevel: toSharedStrengthLevel(progressRecord.strengthLevel),
          totalLessons,
          totalQuizzes,
          averageScore,
          topics: mapTopicStrengths(progressRecord.topicScores, progressRecord.updatedAt),
          lastActiveAt: progressRecord.updatedAt.toISOString(),
        };
      }),
    );
  }

  async getSubject(userId: string, subjectId: string): Promise<SubjectDetailContent> {
    const subjects = await this.getSubjects(userId);
    const subject = subjects.find((entry) => entry.subjectId === subjectId);

    if (!subject) {
      throw new NotFoundException('Subject progress not found');
    }

    return { subject };
  }

  async getHistory(userId: string, cursor?: string, limit = 20): Promise<SessionHistoryContent> {
    const sessionRecords = await this.prisma.sessionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      take: limit + 1,
    });

    const hasMore = sessionRecords.length > limit;
    const visibleSessionRecords = sessionRecords.slice(0, limit);

    return {
      sessions: visibleSessionRecords.map(mapSessionRecord),
      cursor: hasMore ? visibleSessionRecords[visibleSessionRecords.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async getGrowthAreas(userId: string) {
    return listGrowthAreaSnapshots(this.prisma, userId, 8);
  }
}

function calculateXpLevel(sessionCount: number): number {
  return Math.max(1, Math.ceil(Math.max(sessionCount, 1) / 5));
}

function mapTopicStrengths(topicScores: unknown, updatedAt: Date): TopicStrength[] {
  if (!topicScores || typeof topicScores !== 'object' || Array.isArray(topicScores)) {
    return [];
  }

  return Object.entries(topicScores)
    .flatMap(([topic, rawScore]) => {
      if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
        return [];
      }

      const normalizedScore = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

      return [{
        topic,
        level: toTopicLevel(normalizedScore),
        score: normalizedScore,
        lastTestedAt: updatedAt.toISOString(),
      }];
    })
    .sort((left, right) => right.score - left.score);
}

function toTopicLevel(score: number): TopicStrength['level'] {
  if (score >= 80) {
    return 'confident';
  }

  if (score >= 60) {
    return 'getting_there';
  }

  return 'needs_work';
}

function mapSessionRecord(sessionRecord: {
  id: string;
  userId: string;
  type: 'LESSON' | 'QUIZ';
  subjectName: string;
  topic: string;
  durationMs: number;
  createdAt: Date;
  lessonId: string | null;
  quizId: string | null;
}): SessionRecord {
  const durationMinutes = Math.max(1, Math.round(sessionRecord.durationMs / 60000));

  return {
    id: sessionRecord.id,
    ownerId: sessionRecord.userId,
    type: sessionRecord.type === 'LESSON' ? 'lesson' : 'quiz',
    subject: sessionRecord.subjectName,
    topic: sessionRecord.topic,
    duration: durationMinutes,
    xpEarned: durationMinutes,
    createdAt: sessionRecord.createdAt.toISOString(),
    resourceId: sessionRecord.lessonId ?? sessionRecord.quizId ?? sessionRecord.id,
  };
}
