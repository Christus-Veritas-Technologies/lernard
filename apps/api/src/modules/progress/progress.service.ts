import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PagePayload,
  ProgressContent,
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
    const [user, subjects] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          streakDays: true,
          sessionCount: true,
        },
      }),
      this.getSubjects(userId),
    ]);

    return buildPagePayload(
      {
        streak: user.streakDays,
        xpLevel: calculateXpLevel(user.sessionCount),
        subjects,
      },
      {
        permissions: [],
      },
    );
  }

  async getSubjects(userId: string): Promise<SubjectProgress[]> {
    const progressRecords = await this.prisma.subjectProgress.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    });

    return progressRecords.map((progressRecord) => ({
      subjectId: progressRecord.subjectId,
      subjectName: progressRecord.subject.name,
      strengthLevel: toSharedStrengthLevel(progressRecord.strengthLevel),
      topics: mapTopicStrengths(progressRecord.topicScores, progressRecord.updatedAt),
      lastActiveAt: progressRecord.updatedAt.toISOString(),
    }));
  }

  async getSubject(userId: string, subjectId: string): Promise<SubjectDetailContent> {
    const subjects = await this.getSubjects(userId);
    const subject = subjects.find((entry) => entry.subjectId === subjectId);

    if (!subject) {
      throw new NotFoundException('Subject progress not found');
    }

    return { subject };
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
