import { Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import type {
  DayActivity,
  HomeContent,
  PagePayload,
  PlanUsage,
  ScopedPermission,
  SlotAssignments,
  StrengthBreakdown,
  SubjectTopicBreakdown,
  TopicSummary,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  buildNullSlots,
  buildPagePayload,
} from '../../common/utils/build-page-payload';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

const FIRST_LOOK_BASELINE_KEY = '__first_look__';

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPayload(userId: string): Promise<PagePayload<HomeContent>> {
    const [
      user,
      userSubjects,
      subjectProgress,
      recentSessions,
      sessionsToday,
      recentSessionCompletions,
    ] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            name: true,
            streakDays: true,
            lastActiveAt: true,
            dailyGoal: true,
            sessionCount: true,
            firstLookComplete: true,
            plan: true,
            billingAnchorDay: true,
            storageBytesUsed: true,
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
        (this.prisma as any).session.findMany({
          where: {
            userId,
            completedAt: {
              gte: startOfRecentWindowUtc(),
            },
          },
          select: {
            completedAt: true,
          },
        }),
      ]);

    const trackedSubjectNames = userSubjects.map(
      (userSubject) => userSubject.subject.name,
    );
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
      subjectSessionRows.map(
        (row: { subjectName: string | null; _count: { _all: number } }) => [
          row.subjectName ?? 'General',
          row._count._all,
        ],
      ),
    );

    const subjectProgressById = new Map(
      subjectProgress.map((progress) => [progress.subjectId, progress]),
    );

    // Aggregate topic scores across all subjects
    const allTopicScores: Array<{
      topic: string;
      subjectName: string;
      score: number;
    }> = [];
    const strengthBreakdown: StrengthBreakdown = {
      strong: 0,
      developing: 0,
      needsWork: 0,
    };

    for (const sp of subjectProgress) {
      const activityCount = sessionCountBySubjectName.get(sp.subject.name) ?? 0;
      if (activityCount === 0) {
        continue;
      }

      const topicData = sp.topicScores as Record<string, unknown>;
      for (const [topic, rawScore] of Object.entries(topicData)) {
        if (topic === FIRST_LOOK_BASELINE_KEY) continue;
        if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) continue;
        const score100 =
          rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
        allTopicScores.push({
          topic,
          subjectName: sp.subject.name,
          score: score100,
        });
        if (rawScore >= 0.7) strengthBreakdown.strong++;
        else if (rawScore >= 0.4) strengthBreakdown.developing++;
        else strengthBreakdown.needsWork++;
      }
    }

    const masteredTopicCount = allTopicScores.filter(
      (t) => t.score >= 70,
    ).length;
    const totalTopicCount = allTopicScores.length;

    const passRate =
      allTopicScores.length > 0
        ? Math.round(
            allTopicScores.reduce((sum, t) => sum + t.score, 0) /
              allTopicScores.length,
          )
        : 0;

    const recentActivity: DayActivity[] = buildRecentActivity(
      recentSessionCompletions,
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
      const readinessPercent =
        activityCount > 0 && nonBaselineScores.length
          ? Math.round(
              (nonBaselineScores.reduce((total, score) => total + score, 0) /
                nonBaselineScores.length) *
                100,
            )
          : null;

      return {
        subjectId: us.subjectId,
        subjectName: us.subject.name,
        strongCount: nonBaselineScores.filter((s) => s >= 0.7).length,
        developingCount: nonBaselineScores.filter((s) => s >= 0.4 && s < 0.7)
          .length,
        needsWorkCount: nonBaselineScores.filter((s) => s < 0.4).length,
        readinessPercent,
        readinessState: readinessPercent === null ? 'baseline_only' : 'active',
        activityCount,
      };
    });

    const planUsage = await this.getPlanUsage(userId, user.plan, user.billingAnchorDay, user.storageBytesUsed);

    const content: HomeContent = {
      greeting: buildGreeting(user.name),
      streak: Math.max(user.streakDays, calculateRecentActivityStreak(recentActivity)),
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
          subjectProgressById
            .get(userSubject.subjectId)
            ?.updatedAt.toISOString() ?? null,
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
      planUsage,
    };

    return buildPagePayload(content, {
      permissions: buildHomePermissions(),
      slots: buildHomeSlots(user.firstLookComplete),
    });
  }

  private async getPlanUsage(
    userId: string,
    plan: Plan,
    billingAnchorDay: number | null,
    storageBytesUsed: number,
  ): Promise<PlanUsage> {
    const anchor = billingAnchorDay ?? 1;
    const isDaily = plan === Plan.EXPLORER;
    const periodKey = isDaily ? `day:${todayKey()}` : `month:${billingPeriodKey(anchor)}`;

    const [lessonsUsed, quizzesUsed, projectsUsed, chatMessagesUsed] = await Promise.all([
      this.redis.getCount(`rate:${userId}:lessons:${periodKey}`),
      this.redis.getCount(`rate:${userId}:quizzes:${periodKey}`),
      this.redis.getCount(`rate:${userId}:projects:${periodKey}`),
      this.redis.getCount(`rate:${userId}:chatMessages:${periodKey}`),
    ]);

    const limits: Record<Plan, { lessons: number; quizzes: number; projects: number; chatMessages: number; storageMb: number }> = {
      [Plan.EXPLORER]:               { lessons: 2,   quizzes: 2,   projects: 1,  chatMessages: 10,   storageMb: 100  },
      [Plan.SCHOLAR]:                { lessons: 40,  quizzes: 40,  projects: 5,  chatMessages: 500,  storageMb: 500  },
      [Plan.HOUSEHOLD]:              { lessons: 80,  quizzes: 80,  projects: 10, chatMessages: 800,  storageMb: 2000 },
      [Plan.STUDENT_SCHOLAR]:        { lessons: 40,  quizzes: 40,  projects: 5,  chatMessages: 500,  storageMb: 500  },
      [Plan.STUDENT_PRO]:            { lessons: 120, quizzes: 120, projects: 15, chatMessages: 1500, storageMb: 2000 },
      [Plan.GUARDIAN_FAMILY_STARTER]:  { lessons: 50,  quizzes: 50,  projects: 5,  chatMessages: 600,  storageMb: 1000 },
      [Plan.GUARDIAN_FAMILY_STANDARD]: { lessons: 80,  quizzes: 80,  projects: 10, chatMessages: 800,  storageMb: 2000 },
      [Plan.GUARDIAN_FAMILY_PREMIUM]:  { lessons: 150, quizzes: 150, projects: 15, chatMessages: 1200, storageMb: 5000 },
    };

    const planLimits = limits[plan] ?? limits[Plan.EXPLORER];
    const resetAt = isDaily ? tomorrowMidnightIso() : nextBillingAnchorIso(anchor);

    return {
      plan: plan.toLowerCase() as PlanUsage['plan'],
      lessonsUsed,
      lessonsLimit: planLimits.lessons,
      quizzesUsed,
      quizzesLimit: planLimits.quizzes,
      projectsUsed,
      projectsLimit: planLimits.projects,
      chatMessagesUsed,
      chatMessagesLimit: planLimits.chatMessages,
      storageUsedMb: Math.round(storageBytesUsed / (1024 * 1024)),
      storageLimitMb: planLimits.storageMb,
      resetAt,
    };
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function billingPeriodKey(anchorDay: number): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let pYear = year;
  let pMonth = month;
  if (day < anchorDay) {
    pMonth = month - 1;
    if (pMonth < 0) { pMonth = 11; pYear = year - 1; }
  }
  const mm = String(pMonth + 1).padStart(2, '0');
  const dd = String(anchorDay).padStart(2, '0');
  return `${pYear}-${mm}-${dd}`;
}

function tomorrowMidnightIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function nextBillingAnchorIso(anchorDay: number): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let nextYear = year;
  let nextMonth = day < anchorDay ? month : month + 1;
  if (nextMonth > 11) { nextMonth = 0; nextYear = year + 1; }
  return new Date(Date.UTC(nextYear, nextMonth, anchorDay)).toISOString();
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
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfRecentWindowUtc(): Date {
  const start = startOfTodayUtc();
  start.setUTCDate(start.getUTCDate() - 6);
  return start;
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function buildRecentActivity(
  sessionCompletions: Array<{ completedAt: Date }>,
): DayActivity[] {
  const activeDateKeys = new Set(
    sessionCompletions.map((session) => toUtcDateKey(session.completedAt)),
  );
  const start = startOfRecentWindowUtc();

  const result: DayActivity[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setUTCDate(start.getUTCDate() + i);
    const dayKey = toUtcDateKey(dayDate);

    result.push({
      day: DAY_LABELS[dayDate.getUTCDay()],
      active: activeDateKeys.has(dayKey),
    });
  }
  return result;
}

function calculateRecentActivityStreak(recentActivity: DayActivity[]): number {
  let streak = 0;
  for (let i = recentActivity.length - 1; i >= 0; i--) {
    if (!recentActivity[i]?.active) break;
    streak += 1;
  }
  return streak;
}
