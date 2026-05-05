import { Injectable } from '@nestjs/common';
import type { HomeContent, PagePayload, ScopedPermission, SlotAssignments } from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildNullSlots, buildPagePayload } from '../../common/utils/build-page-payload';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayload(userId: string): Promise<PagePayload<HomeContent>> {
    const [user, userSubjects, subjectProgress] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          streakDays: true,
          dailyGoal: true,
          sessionCount: true,
        },
      }),
      this.prisma.userSubject.findMany({
        where: { userId },
        include: { subject: true },
        orderBy: { priorityIndex: 'asc' },
      }),
      this.prisma.subjectProgress.findMany({
        where: { userId },
        select: {
          subjectId: true,
          strengthLevel: true,
          updatedAt: true,
        },
      }),
    ]);

    const subjectProgressById = new Map(
      subjectProgress.map((progress) => [progress.subjectId, progress]),
    );

    const content: HomeContent = {
      greeting: buildGreeting(user.name),
      streak: user.streakDays,
      xpLevel: calculateXpLevel(user.sessionCount),
      dailyGoalProgress: 0,
      dailyGoalTarget: user.dailyGoal,
      subjects: userSubjects.map((userSubject) => ({
        subjectId: userSubject.subjectId,
        name: userSubject.subject.name,
        priorityIndex: userSubject.priorityIndex,
        strengthLevel: toSharedStrengthLevel(
          subjectProgressById.get(userSubject.subjectId)?.strengthLevel,
        ),
        lastActiveAt:
          subjectProgressById.get(userSubject.subjectId)?.updatedAt.toISOString() ?? null,
      })),
    };

    return buildPagePayload(content, {
      permissions: buildHomePermissions(),
      slots: buildHomeSlots(user.sessionCount),
    });
  }
}

function buildGreeting(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] ?? 'there';
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return `Good morning, ${firstName}.`;
  }

  if (currentHour < 18) {
    return `Good afternoon, ${firstName}.`;
  }

  return `Good evening, ${firstName}.`;
}

function calculateXpLevel(sessionCount: number): number {
  return Math.max(1, Math.ceil(Math.max(sessionCount, 1) / 5));
}

function buildHomePermissions(): ScopedPermission[] {
  return [
    { action: 'can_edit_mode' },
  ];
}

function buildHomeSlots(sessionCount: number): SlotAssignments {
  if (sessionCount === 0) {
    return {
      ...buildNullSlots(['streak_nudge', 'primary_cta']),
      urgent_action: {
        type: 'first_lesson_nudge',
        data: {
          title: 'Start your First Look',
          description: 'Give Lernard one quick check-in so your next lesson feels personal from day one.',
        },
      },
    };
  }

  return buildNullSlots(['urgent_action', 'streak_nudge', 'primary_cta']);
}