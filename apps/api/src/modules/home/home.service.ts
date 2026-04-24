import { Injectable } from '@nestjs/common';
import type { HomeContent, PagePayload, ScopedPermission, SlotAssignments } from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildNullSlots, buildPagePayload } from '../../common/utils/build-page-payload';
import { listRecentSessions } from '../../common/utils/page-payload-queries';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayload(userId: string): Promise<PagePayload<HomeContent>> {
    const [user, recentSessions, userSubjects, subjectProgress, lastLesson, sessionsToday] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          streakDays: true,
          dailyGoal: true,
          sessionCount: true,
        },
      }),
      listRecentSessions(this.prisma, userId, 5),
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
      this.prisma.lesson.findFirst({
        where: {
          userId,
          deletedAt: null,
          completed: false,
        },
        include: { subject: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sessionRecord.count({
        where: {
          userId,
          createdAt: {
            gte: startOfToday(),
          },
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
      lastLesson: lastLesson
        ? {
            id: lastLesson.id,
            topic: lastLesson.topic,
            subject: lastLesson.subject?.name ?? 'General',
          }
        : null,
      dailyGoalProgress: sessionsToday,
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
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        type: session.type,
        topic: session.topic,
        subject: session.subjectName,
        createdAt: session.createdAt,
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
    { action: 'can_start_lesson' },
    { action: 'can_take_quiz' },
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

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}