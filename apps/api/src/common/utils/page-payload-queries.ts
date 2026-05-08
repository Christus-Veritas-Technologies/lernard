import { PrismaService } from '../../prisma/prisma.service';

export interface GrowthAreaSnapshot {
  subjectId: string;
  subjectName: string;
  topic: string;
  score: number;
  lastUpdatedAt: string;
}

export interface PendingInviteSnapshot {
  id: string;
  childEmail: string | null;
  code: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface GuardianChildSnapshot {
  studentId: string;
  name: string;
  streakDays: number;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface CompanionAuditSnapshot {
  lastChangedAt: string;
  lastChangedBy: string;
  lockedByGuardian: boolean;
}

export async function listGrowthAreaSnapshots(
  prisma: PrismaService,
  userId: string,
  limit = 5,
): Promise<GrowthAreaSnapshot[]> {
  const subjectProgressRecords = await prisma.subjectProgress.findMany({
    where: { userId },
    include: { subject: true },
    orderBy: { updatedAt: 'desc' },
  });

  return subjectProgressRecords
    .flatMap((subjectProgressRecord) => {
      const topicScores = toTopicScores(subjectProgressRecord.topicScores);

      return topicScores.map((topicScore) => ({
        subjectId: subjectProgressRecord.subjectId,
        subjectName: subjectProgressRecord.subject.name,
        topic: topicScore.topic,
        score: topicScore.score,
        lastUpdatedAt: subjectProgressRecord.updatedAt.toISOString(),
      }));
    })
    .sort((left, right) => left.score - right.score)
    .slice(0, limit);
}

export async function listPendingInviteSnapshots(
  prisma: PrismaService,
  guardianUserId: string,
  limit = 10,
): Promise<PendingInviteSnapshot[]> {
  const invites = await prisma.childInvite.findMany({
    where: {
      guardian: {
        userId: guardianUserId,
      },
      usedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return invites.map((invite) => ({
    id: invite.id,
    childEmail: invite.childEmail ?? null,
    code: invite.code,
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    usedAt: invite.usedAt?.toISOString() ?? null,
  }));
}

export async function listGuardianChildSnapshots(
  prisma: PrismaService,
  guardianId: string,
): Promise<GuardianChildSnapshot[]> {
  const children = await prisma.user.findMany({
    where: {
      controlledByGuardianId: guardianId,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      streakDays: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  return children.map((child) => ({
    studentId: child.id,
    name: child.name,
    streakDays: child.streakDays,
    lastActiveAt: child.lastActiveAt?.toISOString() ?? null,
    createdAt: child.createdAt.toISOString(),
  }));
}

export async function getCompanionAuditSnapshot(
  prisma: PrismaService,
  studentId: string,
): Promise<CompanionAuditSnapshot | null> {
  const companionControls = await prisma.companionControls.findUnique({
    where: { studentId },
  });

  if (!companionControls) {
    return null;
  }

  return {
    lastChangedAt: companionControls.lastChangedAt.toISOString(),
    lastChangedBy: companionControls.lastChangedBy,
    lockedByGuardian: companionControls.lockedByGuardian,
  };
}

interface TopicScoreEntry {
  topic: string;
  score: number;
}

function toTopicScores(topicScores: unknown): TopicScoreEntry[] {
  if (
    !topicScores ||
    typeof topicScores !== 'object' ||
    Array.isArray(topicScores)
  ) {
    return [];
  }

  return Object.entries(topicScores).flatMap(([topic, score]) => {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      return [];
    }

    return [{ topic, score }];
  });
}
