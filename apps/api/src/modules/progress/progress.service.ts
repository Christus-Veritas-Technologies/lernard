import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan } from '@prisma/client';
import type {
  GrowthAreaItem,
  HistorySessionItem,
  PaginatedHistoryResponse,
  PagePayload,
  PlanUsage,
  ProgressContent,
  ProgressSummary,
  SubjectDetailContent,
  SubjectProgress,
  TopicStrength,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MastraService } from '../../mastra/mastra.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';

const HISTORY_CAP_DAYS_EXPLORER = 30;

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mastra: MastraService,
  ) {}

  async getOverview(userId: string): Promise<PagePayload<ProgressContent>> {
    const [user, subjects, growthAreas] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          streakDays: true,
          sessionCount: true,
          plan: true,
          billingAnchorDay: true,
          storageBytesUsed: true,
        },
      }),
      this.getSubjects(userId),
      this.getGrowthAreas(userId),
    ]);

    const planUsage = await this.getPlanUsage(
      userId,
      user.plan,
      user.billingAnchorDay,
      user.storageBytesUsed,
    );

    return buildPagePayload(
      {
        streak: user.streakDays,
        xpLevel: calculateXpLevel(user.sessionCount),
        xpPoints: user.sessionCount * 10,
        subjects,
        growthAreas,
        planUsage,
      },
      { permissions: [] },
    );
  }

  async getPlanUsage(
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
      topics: mapTopicStrengths(
        progressRecord.topicScores,
        progressRecord.updatedAt,
      ),
      lastActiveAt: progressRecord.updatedAt.toISOString(),
    }));
  }

  async getSubject(
    userId: string,
    subjectId: string,
  ): Promise<SubjectDetailContent> {
    const subjects = await this.getSubjects(userId);
    const subject = subjects.find((entry) => entry.subjectId === subjectId);

    if (!subject) {
      throw new NotFoundException('Subject progress not found');
    }

    return { subject };
  }

  async getGrowthAreas(userId: string): Promise<GrowthAreaItem[]> {
    const subjectProgressRecords = await this.prisma.subjectProgress.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    });

    const items: GrowthAreaItem[] = [];

    for (const record of subjectProgressRecords) {
      const topicScores = toTopicScoresMap(record.topicScores);

      for (const [topic, score] of Object.entries(topicScores)) {
        const normalized =
          typeof score === 'number'
            ? score <= 1
              ? Math.round(score * 100)
              : Math.round(score)
            : null;

        if (normalized === null || normalized >= 60) continue;

        const lastSession = await (this.prisma as any).session.findFirst({
          where: { userId, topic },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        });

        items.push({
          subjectId: record.subjectId,
          subjectName: record.subject.name,
          topic,
          score: normalized,
          flagReason:
            normalized < 40
              ? `Score ${normalized}% — needs significant work`
              : `Score ${normalized}% — developing`,
          flagCount: 1,
          lastAttemptedAt: lastSession?.completedAt?.toISOString() ?? null,
        });
      }
    }

    return items.sort((a, b) => a.score - b.score).slice(0, 8);
  }

  async dismissGrowthArea(
    userId: string,
    subjectId: string,
    topic: string,
  ): Promise<void> {
    // Mark the topic score as "dismissed" by setting it to a neutral 65
    // (above the needs_work threshold but not artificially strong)
    const record = await this.prisma.subjectProgress.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });

    if (!record) return;

    const scores = toTopicScoresMap(record.topicScores);
    if (topic in scores) {
      scores[topic] = 0.65;
      await this.prisma.subjectProgress.update({
        where: { userId_subjectId: { userId, subjectId } },
        data: { topicScores: scores },
      });
    }
  }

  async getSummary(userId: string): Promise<ProgressSummary | null> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { streakDays: true, sessionCount: true, plan: true },
    });

    // Skip if not enough sessions to analyse
    if (user.sessionCount < 3) return null;

    const [growthAreas, subjectProgressRecords] = await Promise.all([
      this.getGrowthAreas(userId),
      this.prisma.subjectProgress.findMany({
        where: { userId },
        include: { subject: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Get recent sessions
    const recentSessions = await (this.prisma as any).session.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const recentLessons: Array<{ topic: string; subjectName: string; confidenceRating: number | null }> = [];
    const recentQuizzes: Array<{ topic: string; subjectName: string; score: number; totalQuestions: number }> = [];

    for (const session of recentSessions) {
      if (session.type === 'LESSON' && recentLessons.length < 5) {
        recentLessons.push({
          topic: session.topic,
          subjectName: session.subjectName ?? 'General',
          confidenceRating: null,
        });
      } else if (session.type === 'QUIZ' && recentQuizzes.length < 5) {
        const quiz = session.quizId
          ? await (this.prisma as any).quiz.findUnique({
              where: { id: session.quizId },
              select: { score: true, totalQuestions: true },
            })
          : null;
        recentQuizzes.push({
          topic: session.topic,
          subjectName: session.subjectName ?? 'General',
          score: quiz?.score ?? 0,
          totalQuestions: quiz?.totalQuestions ?? 0,
        });
      }
    }

    const topSubjects = subjectProgressRecords.map((r) => r.subject.name);

    return this.mastra.generateProgressSummary({
      recentLessons,
      recentQuizzes,
      growthAreas: growthAreas.map((g) => ({
        topic: g.topic,
        subjectName: g.subjectName,
        score: g.score,
        flagCount: g.flagCount,
      })),
      topSubjects,
      streak: user.streakDays,
      plan: user.plan.toLowerCase(),
    });
  }

  async getHistory(
    userId: string,
    cursor?: string,
    subjectName?: string,
    type?: 'lesson' | 'quiz',
    dateFilter?: '7d' | 'month' | '3m' | 'all',
  ): Promise<PaginatedHistoryResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true, billingAnchorDay: true },
    });

    const isExplorer = user.plan === Plan.EXPLORER;
    const take = 20;
    const where: Record<string, unknown> = { userId };

    if (subjectName) where.subjectName = subjectName;
    if (type) where.type = type === 'lesson' ? 'LESSON' : 'QUIZ';

    // Date filter
    const fromDate = resolveFromDate(dateFilter, isExplorer);
    if (fromDate) {
      where.completedAt = { gte: fromDate };
    }

    const sessions = await (this.prisma as any).session.findMany({
      where,
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = sessions.length > take;
    const page = hasMore ? sessions.slice(0, take) : sessions;

    // Enrich with lesson confidence and quiz scores
    const enriched = await Promise.all(
      page.map(async (session: any): Promise<HistorySessionItem> => {
        let confidenceRating: number | null = null;
        let score: number | null = null;
        let scoreOutOf: number | null = null;

        if (session.type === 'LESSON' && session.lessonId) {
          const lesson = await (this.prisma as any).lesson.findUnique({
            where: { id: session.lessonId },
            select: { confidenceRating: true },
          });
          confidenceRating = lesson?.confidenceRating ?? null;
        } else if (session.type === 'QUIZ' && session.quizId) {
          const quiz = await (this.prisma as any).quiz.findUnique({
            where: { id: session.quizId },
            select: { score: true, totalQuestions: true },
          });
          score = quiz?.score ?? null;
          scoreOutOf = quiz?.totalQuestions ?? null;
        }

        return {
          id: session.id,
          type: session.type === 'QUIZ' ? 'quiz' : 'lesson',
          subjectName: session.subjectName ?? 'General',
          topic: session.topic,
          durationMinutes: session.durationMinutes,
          completedAt: session.completedAt.toISOString(),
          confidenceRating,
          score,
          scoreOutOf,
        };
      }),
    );

    return {
      sessions: enriched,
      hasMore,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      historyCapDays: isExplorer ? HISTORY_CAP_DAYS_EXPLORER : null,
    };
  }

  async resetProgress(userId: string): Promise<void> {
    await Promise.all([
      this.prisma.subjectProgress.deleteMany({ where: { userId } }),
      this.prisma.lesson.deleteMany({ where: { userId } }),
      this.prisma.quiz.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    await this.prisma.user.update({
      where: { id: userId },
      data: { streakDays: 0, sessionCount: 0 },
    });
  }
}

function calculateXpLevel(sessionCount: number): number {
  return Math.max(1, Math.ceil(Math.max(sessionCount, 1) / 5));
}

function mapTopicStrengths(
  topicScores: unknown,
  updatedAt: Date,
): TopicStrength[] {
  if (
    !topicScores ||
    typeof topicScores !== 'object' ||
    Array.isArray(topicScores)
  ) {
    return [];
  }

  return Object.entries(topicScores)
    .flatMap(([topic, rawScore]) => {
      if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
        return [];
      }

      const normalizedScore =
        rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

      return [
        {
          topic,
          level: toTopicLevel(normalizedScore),
          score: normalizedScore,
          lastTestedAt: updatedAt.toISOString(),
        },
      ];
    })
    .sort((left, right) => right.score - left.score);
}

function toTopicLevel(score: number): TopicStrength['level'] {
  if (score >= 80) return 'confident';
  if (score >= 60) return 'getting_there';
  return 'needs_work';
}

function toTopicScoresMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, number>;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function resolveFromDate(
  dateFilter: '7d' | 'month' | '3m' | 'all' | undefined,
  isExplorer: boolean,
): Date | null {
  const now = new Date();

  if (isExplorer) {
    // Always cap at 30 days for Explorer regardless of client filter
    const cap = new Date(now);
    cap.setUTCDate(cap.getUTCDate() - 30);
    return cap;
  }

  if (!dateFilter || dateFilter === 'all') return null;

  const d = new Date(now);
  if (dateFilter === '7d') d.setUTCDate(d.getUTCDate() - 7);
  else if (dateFilter === 'month') d.setUTCMonth(d.getUTCMonth() - 1);
  else if (dateFilter === '3m') d.setUTCMonth(d.getUTCMonth() - 3);
  return d;
}
