import { Injectable } from '@nestjs/common';
import type {
  DayActivity,
  HomeContent,
  PagePayload,
  ScopedPermission,
  SlotAssignments,
  StrengthBreakdown,
  SubjectTopicBreakdown,
  TopicSummary,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildNullSlots, buildPagePayload } from '../../common/utils/build-page-payload';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

const FIRST_LOOK_BASELINE_KEY = '__first_look__';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getPayload(userId: string): Promise<PagePayload<HomeContent>> {
    const [user, userSubjects, subjectProgress, recentSessions, sessionsToday] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          streakDays: true,
          lastActiveAt: true,
          dailyGoal: true,
          sessionCount: true,
          firstLookComplete: true,
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
          topicScores: true,
          subject: { select: { name: true } },
        },
      }),
      (this.prisma as any).session.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 3,
      }),
      (this.prisma as any).session.count({
        where: {
          userId,
          completedAt: {
            gte: startOfTodayUtc(),
          },
        },
      }),
    ]);

    const trackedSubjectNames = userSubjects.map((userSubject) => userSubject.subject.name);
    const subjectSessionRows = trackedSubjectNames.length
      ? await (this.prisma as any).session.groupBy({
          by: ['subjectName'],
          where: {
            userId,
            subjectName: {
              in: trackedSubjectNames,
            },
          },
          _count: {
            _all: true,
          },
        })
      : [];
    const sessionCountBySubjectName = new Map<string, number>(
      subjectSessionRows.map((row: { subjectName: string | null; _count: { _all: number } }) => [
        row.subjectName ?? 'General',
        row._count._all,
      ]),
    );

    const subjectProgressById = new Map(
      subjectProgress.map((progress) => [progress.subjectId, progress]),
    );

    // Aggregate topic scores across all subjects
    const allTopicScores: Array<{ topic: string; subjectName: string; score: number }> = [];
    const strengthBreakdown: StrengthBreakdown = { strong: 0, developing: 0, needsWork: 0 };

    for (const sp of subjectProgress) {
      const activityCount = sessionCountBySubjectName.get(sp.subject.name) ?? 0;
      if (activityCount === 0) {
        continue;
      }

      const topicData = sp.topicScores as Record<string, unknown>;
      for (const [topic, rawScore] of Object.entries(topicData)) {
        if (topic === FIRST_LOOK_BASELINE_KEY) continue;
        if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) continue;
        const score100 = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
        allTopicScores.push({ topic, subjectName: sp.subject.name, score: score100 });
        if (rawScore >= 0.7) strengthBreakdown.strong++;
        else if (rawScore >= 0.4) strengthBreakdown.developing++;
        else strengthBreakdown.needsWork++;
      }
    }

    const masteredTopicCount = allTopicScores.filter((t) => t.score >= 70).length;
    const totalTopicCount = allTopicScores.length;

    const passRate =
      allTopicScores.length > 0
        ? Math.round(
            allTopicScores.reduce((sum, t) => sum + t.score, 0) / allTopicScores.length,
          )
        : 0;

    const recentActivity: DayActivity[] = buildRecentActivity(
      user.lastActiveAt,
      user.streakDays,
    );

    const topTopics: TopicSummary[] = [...allTopicScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const subjectTopics: SubjectTopicBreakdown[] = userSubjects.map((us) => {
      const activityCount = sessionCountBySubjectName.get(us.subject.name) ?? 0;
      const sp = subjectProgressById.get(us.subjectId);
      if (!sp) {
        return {
          subjectId: us.subjectId,
          subjectName: us.subject.name,
          strongCount: 0,
          developingCount: 0,
          needsWorkCount: 0,
          readinessPercent: null,
          readinessState: 'baseline_only',
          activityCount,
        };
      }

      const topicData = sp.topicScores as Record<string, unknown>;
      const topicValues = Object.entries(topicData).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && !Number.isNaN(entry[1]),
      );

      const nonBaselineScores = topicValues
        .filter(([topic]) => topic !== FIRST_LOOK_BASELINE_KEY)
        .map(([, score]) => score);
      const readinessPercent = activityCount > 0 && nonBaselineScores.length
        ? Math.round(
            (nonBaselineScores.reduce((total, score) => total + score, 0)
              / nonBaselineScores.length)
              * 100,
          )
        : null;

      return {
        subjectId: us.subjectId,
        subjectName: us.subject.name,
        strongCount: nonBaselineScores.filter((s) => s >= 0.7).length,
        developingCount: nonBaselineScores.filter((s) => s >= 0.4 && s < 0.7).length,
        needsWorkCount: nonBaselineScores.filter((s) => s < 0.4).length,
        readinessPercent,
        readinessState: readinessPercent === null ? 'baseline_only' : 'active',
        activityCount,
      };
    });

    const content: HomeContent = {
      greeting: buildGreeting(user.name),
      streak: user.streakDays,
      xpLevel: calculateXpLevel(user.sessionCount),
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
      totalSessions: user.sessionCount,
      passRate,
      masteredTopicCount,
      totalTopicCount,
      strengthBreakdown,
      topTopics,
      subjectTopics,
      recentActivity,
      recentSessions: recentSessions.map((session: any) => ({
        id: session.id,
        type: session.type === 'QUIZ' ? 'quiz' : 'lesson',
        topic: session.topic,
        subjectName: session.subjectName ?? 'General',
        completedAt: session.completedAt.toISOString(),
      })),
    };

    return buildPagePayload(content, {
      permissions: buildHomePermissions(),
      slots: buildHomeSlots(user.firstLookComplete),
    });
  }
}

function buildGreeting(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] ?? 'there';
  const currentHour = new Date().getHours();
  if (currentHour < 12) return `Good morning, ${firstName}.`;
  if (currentHour < 18) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
}

function calculateXpLevel(sessionCount: number): number {
  return Math.max(1, Math.ceil(Math.max(sessionCount, 1) / 5));
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function buildHomePermissions(): ScopedPermission[] {
  return [{ action: 'can_edit_mode' }];
}

function buildHomeSlots(firstLookComplete: boolean): SlotAssignments {
  if (!firstLookComplete) {
    return {
      ...buildNullSlots(['streak_nudge', 'primary_cta']),
      urgent_action: {
        type: 'first_lesson_nudge',
        data: {
          title: 'Start your First Look',
          description:
            'Give Lernard one quick check-in so your next lesson feels personal from day one.',
        },
      },
    };
  }
  return buildNullSlots(['urgent_action', 'streak_nudge', 'primary_cta']);
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function buildRecentActivity(lastActiveAt: Date | null, streakDays: number): DayActivity[] {
  const anchor = lastActiveAt ?? new Date();
  const anchorDay = new Date(anchor);
  anchorDay.setHours(0, 0, 0, 0);

  const result: DayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchorDay);
    d.setDate(anchorDay.getDate() - i);
    const diffDays = i; // days before anchor
    result.push({
      day: DAY_LABELS[d.getDay()],
      active: diffDays < streakDays,
    });
  }
  return result;
}