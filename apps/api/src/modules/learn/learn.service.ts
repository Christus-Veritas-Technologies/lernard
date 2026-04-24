import { Injectable } from '@nestjs/common';
import {
  SessionDepth,
  type LearnContent,
  type LearnDraft,
  type LearnRecommendation,
  type PagePayload,
  type ScopedPermission,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import { listGrowthAreaSnapshots } from '../../common/utils/page-payload-queries';
import { toSharedSessionDepth } from '../../common/utils/shared-model-mappers';

@Injectable()
export class LearnService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayload(userId: string): Promise<PagePayload<LearnContent>> {
    const [user, userSubjects, growthAreas, draftLessons] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          preferredDepth: true,
          sessionLength: true,
        },
      }),
      this.prisma.userSubject.findMany({
        where: { userId },
        include: { subject: true },
        orderBy: { priorityIndex: 'asc' },
      }),
      listGrowthAreaSnapshots(this.prisma, userId, 6),
      this.prisma.lesson.findMany({
        where: {
          userId,
          deletedAt: null,
          completed: false,
        },
        include: { subject: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    const recommendations = buildRecommendations(growthAreas);
    const drafts = buildDrafts(draftLessons);

    const content: LearnContent = {
      recommendations,
      drafts,
      subjects: userSubjects.map((userSubject) => ({
        subjectId: userSubject.subjectId,
        name: userSubject.subject.name,
      })),
      preferredDepth: toSharedSessionDepth(user.preferredDepth),
      preferredSessionLength: user.sessionLength,
      focusTopic: recommendations[0]?.topic ?? drafts[0]?.topic ?? null,
    };

    return buildPagePayload(content, {
      permissions: buildLearnPermissions(),
    });
  }
}

function buildRecommendations(
  growthAreas: Array<{ topic: string; subjectName: string; score: number }>,
): LearnRecommendation[] {
  return growthAreas.map((growthArea) => {
    const depth = chooseDepth(growthArea.score);

    return {
      topic: growthArea.topic,
      subject: growthArea.subjectName,
      reason: buildRecommendationReason(growthArea.score, growthArea.subjectName),
      depth,
      estimatedMinutes: estimateMinutes(depth),
    };
  });
}

function buildDrafts(
  draftLessons: Array<{ id: string; topic: string; subject: { name: string } | null }>,
): LearnDraft[] {
  return draftLessons.map((draftLesson) => ({
    id: draftLesson.id,
    topic: draftLesson.topic,
    subject: draftLesson.subject?.name ?? 'General',
    status: 'Ready to continue',
    nextStep: 'Resume lesson',
  }));
}

function chooseDepth(score: number): SessionDepth {
  if (score <= 0.45) {
    return SessionDepth.DEEP;
  }

  if (score <= 0.7) {
    return SessionDepth.STANDARD;
  }

  return SessionDepth.QUICK;
}

function estimateMinutes(depth: SessionDepth): number {
  switch (depth) {
    case SessionDepth.DEEP:
      return 20;
    case SessionDepth.QUICK:
      return 10;
    case SessionDepth.STANDARD:
    default:
      return 15;
  }
}

function buildRecommendationReason(score: number, subjectName: string): string {
  if (score <= 0.45) {
    return `${subjectName} needs a slower walk-through before the next quiz or lesson.`;
  }

  if (score <= 0.7) {
    return `${subjectName} is moving, but another worked pass should make it stick.`;
  }

  return `${subjectName} only needs a quick refresher to stay warm.`;
}

function buildLearnPermissions(): ScopedPermission[] {
  return [
    { action: 'can_start_lesson' },
    { action: 'can_take_quiz' },
  ];
}