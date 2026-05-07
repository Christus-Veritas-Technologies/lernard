import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type LearningModeKey = 'guide' | 'companion';
export type DepthKey = 'quick' | 'standard' | 'deep';
export type AgeGroupKey = 'primary' | 'secondary' | 'university' | 'professional';
export type LearningGoalKey = 'exam_prep' | 'keep_up' | 'learn_something_new' | 'fill_gaps';
export type StrengthKey = 'strong' | 'developing' | 'needs_work';

export interface StudentContextSubject {
  name: string;
  priorityIndex: number;
  strengthLevel: StrengthKey;
}

export interface StudentContextLesson {
  topic: string;
  subjectName: string;
  completedAt: string;
  confidenceRating: number | null;
}

export interface StudentContextGrowthArea {
  topic: string;
  subjectName: string;
  flagReason: 'quiz_errors' | 'low_confidence' | 'repeated_miss';
}

export interface StudentContextLastQuiz {
  topic: string;
  subjectName: string;
  score: number;
  total: number;
  weakTopics: string[];
}

export interface StudentContext {
  name: string;
  ageGroup: AgeGroupKey | null;
  grade: string | null;
  learningMode: LearningModeKey;
  preferredDepth: DepthKey;
  timezone: string;
  onboardingGoal: LearningGoalKey | null;
  subjects: StudentContextSubject[];
  recentLessonTopics: StudentContextLesson[];
  growthAreas: StudentContextGrowthArea[];
  lastQuizResult: StudentContextLastQuiz | null;
}

const LOW_SCORE_THRESHOLD = 0.5;
const LOW_CONFIDENCE_THRESHOLD = 2;

@Injectable()
export class StudentContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async buildForUser(userId: string): Promise<StudentContext> {
    const prisma = this.prisma as any;

    const [user, userSubjects, subjectProgress, recentLessonSessions, lastQuiz] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          ageGroup: true,
          grade: true,
          timezone: true,
          learningMode: true,
          preferredDepth: true,
          learningGoal: true,
        },
      }),
      prisma.userSubject.findMany({
        where: { userId },
        orderBy: { priorityIndex: 'asc' },
        include: { subject: { select: { id: true, name: true } } },
      }),
      prisma.subjectProgress.findMany({
        where: { userId },
        include: { subject: { select: { id: true, name: true } } },
      }),
      prisma.session.findMany({
        where: { userId, type: 'LESSON', lessonId: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          topic: true,
          subjectName: true,
          completedAt: true,
          lessonId: true,
        },
      }),
      prisma.quiz.findFirst({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        select: {
          topic: true,
          subjectName: true,
          score: true,
          totalQuestions: true,
          weakTopics: true,
        },
      }),
    ]);

    if (!user) {
      return emptyContext();
    }

    const lessonIds = recentLessonSessions
      .map((s: { lessonId: string | null }) => s.lessonId)
      .filter((id: string | null): id is string => Boolean(id));

    const lessonRows: Array<{ id: string; confidenceRating: number | null }> = lessonIds.length
      ? await prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { id: true, confidenceRating: true },
        })
      : [];

    const confidenceById = new Map(lessonRows.map((row) => [row.id, row.confidenceRating]));

    const recentLessonTopics: StudentContextLesson[] = recentLessonSessions.map(
      (session: { topic: string; subjectName: string | null; completedAt: Date; lessonId: string | null }) => ({
        topic: session.topic,
        subjectName: session.subjectName ?? 'General',
        completedAt: session.completedAt.toISOString(),
        confidenceRating: session.lessonId ? confidenceById.get(session.lessonId) ?? null : null,
      }),
    );

    const subjects: StudentContextSubject[] = userSubjects.map(
      (us: { priorityIndex: number; subject: { id: string; name: string } }) => {
        const progress = subjectProgress.find(
          (p: { subjectId: string }) => p.subjectId === us.subject.id,
        );
        return {
          name: us.subject.name,
          priorityIndex: us.priorityIndex,
          strengthLevel: normalizeStrength(progress?.strengthLevel),
        };
      },
    );

    const growthAreas = deriveGrowthAreas({
      subjectProgress,
      recentLessonTopics,
      lastQuiz,
    });

    return {
      name: firstName(user.name),
      ageGroup: normalizeAgeGroup(user.ageGroup),
      grade: user.grade ?? null,
      learningMode: user.learningMode === 'COMPANION' ? 'companion' : 'guide',
      preferredDepth: normalizeDepth(user.preferredDepth),
      timezone: user.timezone ?? 'UTC',
      onboardingGoal: normalizeGoal(user.learningGoal),
      subjects,
      recentLessonTopics,
      growthAreas,
      lastQuizResult: lastQuiz
        ? {
            topic: lastQuiz.topic,
            subjectName: lastQuiz.subjectName ?? 'General',
            score: lastQuiz.score ?? 0,
            total: lastQuiz.totalQuestions ?? 0,
            weakTopics: parseWeakTopics(lastQuiz.weakTopics),
          }
        : null,
    };
  }
}

function emptyContext(): StudentContext {
  return {
    name: 'there',
    ageGroup: null,
    grade: null,
    learningMode: 'guide',
    preferredDepth: 'standard',
    timezone: 'UTC',
    onboardingGoal: null,
    subjects: [],
    recentLessonTopics: [],
    growthAreas: [],
    lastQuizResult: null,
  };
}

function firstName(fullName: string): string {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

function normalizeStrength(value: unknown): StrengthKey {
  if (value === 'STRONG') return 'strong';
  if (value === 'NEEDS_WORK') return 'needs_work';
  return 'developing';
}

function normalizeAgeGroup(value: unknown): AgeGroupKey | null {
  switch (value) {
    case 'PRIMARY':
      return 'primary';
    case 'SECONDARY':
      return 'secondary';
    case 'UNIVERSITY':
      return 'university';
    case 'PROFESSIONAL':
      return 'professional';
    default:
      return null;
  }
}

function normalizeGoal(value: unknown): LearningGoalKey | null {
  switch (value) {
    case 'EXAM_PREP':
      return 'exam_prep';
    case 'KEEP_UP':
      return 'keep_up';
    case 'LEARN_NEW':
      return 'learn_something_new';
    case 'FILL_GAPS':
      return 'fill_gaps';
    default:
      return null;
  }
}

function normalizeDepth(value: unknown): DepthKey {
  if (value === 'quick' || value === 'standard' || value === 'deep') return value;
  return 'standard';
}

function parseWeakTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveGrowthAreas(input: {
  subjectProgress: Array<{
    subject: { name: string };
    topicScores: unknown;
  }>;
  recentLessonTopics: StudentContextLesson[];
  lastQuiz: { subjectName: string | null; weakTopics: unknown } | null;
}): StudentContextGrowthArea[] {
  const seen = new Map<string, StudentContextGrowthArea>();
  const dedupeKey = (topic: string, subject: string) =>
    `${subject.toLowerCase()}::${topic.toLowerCase()}`;

  for (const progress of input.subjectProgress) {
    const scores = progress.topicScores;
    if (!scores || typeof scores !== 'object' || Array.isArray(scores)) continue;
    const subjectName = progress.subject?.name ?? 'General';
    for (const [topic, raw] of Object.entries(scores as Record<string, unknown>)) {
      if (topic === '__first_look__') continue;
      const score = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(score) || score >= LOW_SCORE_THRESHOLD) continue;
      const key = dedupeKey(topic, subjectName);
      if (seen.has(key)) continue;
      seen.set(key, { topic, subjectName, flagReason: 'quiz_errors' });
    }
  }

  for (const lesson of input.recentLessonTopics) {
    if (lesson.confidenceRating === null) continue;
    if (lesson.confidenceRating > LOW_CONFIDENCE_THRESHOLD) continue;
    const key = dedupeKey(lesson.topic, lesson.subjectName);
    if (seen.has(key)) continue;
    seen.set(key, {
      topic: lesson.topic,
      subjectName: lesson.subjectName,
      flagReason: 'low_confidence',
    });
  }

  if (input.lastQuiz) {
    const subjectName = input.lastQuiz.subjectName ?? 'General';
    for (const topic of parseWeakTopics(input.lastQuiz.weakTopics)) {
      const key = dedupeKey(topic, subjectName);
      const existing = seen.get(key);
      if (existing) {
        existing.flagReason = 'repeated_miss';
        continue;
      }
      seen.set(key, { topic, subjectName, flagReason: 'repeated_miss' });
    }
  }

  return Array.from(seen.values()).slice(0, 8);
}
