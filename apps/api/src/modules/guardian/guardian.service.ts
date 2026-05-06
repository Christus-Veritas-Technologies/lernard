import { randomInt } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ChildCompanionContent,
  ChildProfileContent,
  CompanionControls,
  GuardianManagedChildSettings,
  GuardianChildOverview,
  GuardianDashboardContent,
  PagePayload,
  PendingInvite,
  ScopedPermission,
  SubjectProgress,
  TopicStrength,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import { listPendingInviteSnapshots } from '../../common/utils/page-payload-queries';
import {
  toSharedAppearance,
  toSharedLearningMode,
  toSharedStrengthLevel,
} from '../../common/utils/shared-model-mappers';
import type {
  InviteChildDto,
  UpdateChildSettingsDto,
  UpdateChildCompanionControlsDto,
} from './dto/guardian.dto';

@Injectable()
export class GuardianService {
  constructor(private readonly prisma: PrismaService) {}

  async getChildren(userId: string): Promise<GuardianChildOverview[]> {
    const content = await this.buildDashboardContent(userId);
    return content.children;
  }

  async getChildrenPayload(
    userId: string,
  ): Promise<PagePayload<GuardianDashboardContent>> {
    const content = await this.buildDashboardContent(userId);

    return buildPagePayload(content, {
      permissions: buildGuardianPermissions(content.children),
    });
  }

  async inviteChild(userId: string, dto: InviteChildDto): Promise<PendingInvite> {
    const guardian = await this.getGuardianByUserId(userId);
    const invite = await this.prisma.childInvite.create({
      data: {
        guardianId: guardian.id,
        childEmail: dto.childEmail?.toLowerCase() ?? null,
        code: generateInviteCode(),
        expiresAt: daysFromNow(7),
      },
    });

    return mapPendingInvite(invite);
  }

  async acceptInvite(userId: string, code: string) {
    const invite = await this.prisma.childInvite.findFirst({
      where: {
        code,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        guardian: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          controlledByGuardianId: invite.guardianId,
        },
      });

      await transaction.companionControls.upsert({
        where: { studentId: userId },
        update: {
          lockedByGuardian: true,
          lastChangedBy: 'Guardian',
        },
        create: {
          studentId: userId,
          lockedByGuardian: true,
          lastChangedBy: 'Guardian',
        },
      });

      await transaction.childInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
    });

    return { linked: true };
  }

  async getPending(userId: string): Promise<PendingInvite[]> {
    return this.listPendingInvites(userId);
  }

  async cancelInvite(userId: string, token: string) {
    const guardian = await this.getGuardianByUserId(userId);
    const result = await this.prisma.childInvite.deleteMany({
      where: {
        guardianId: guardian.id,
        OR: [{ id: token }, { code: token }],
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Invite not found');
    }

    return { cancelled: true };
  }

  async resendInvite(userId: string, token: string): Promise<PendingInvite> {
    const guardian = await this.getGuardianByUserId(userId);
    const existingInvite = await this.prisma.childInvite.findFirst({
      where: {
        guardianId: guardian.id,
        usedAt: null,
        OR: [{ id: token }, { code: token }],
      },
    });

    if (!existingInvite) {
      throw new NotFoundException('Invite not found');
    }

    const updatedInvite = await this.prisma.childInvite.update({
      where: { id: existingInvite.id },
      data: {
        expiresAt: daysFromNow(7),
      },
    });

    return mapPendingInvite(updatedInvite);
  }

  async getChild(userId: string, childId: string): Promise<GuardianChildOverview> {
    const content = await this.buildChildProfileContent(userId, childId);
    return content.child;
  }

  async getChildPayload(
    userId: string,
    childId: string,
  ): Promise<PagePayload<ChildProfileContent>> {
    const content = await this.buildChildProfileContent(userId, childId);

    return buildPagePayload(content, {
      permissions: buildGuardianChildPermissions(childId),
    });
  }

  async removeChild(userId: string, childId: string) {
    const [{ guardianUser }, child] = await Promise.all([
      this.getGuardianContext(userId),
      this.getChildForGuardian(userId, childId),
    ]);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: child.id },
        data: {
          controlledByGuardianId: null,
          lockedSettings: [],
        },
      });

      await transaction.companionControls.updateMany({
        where: { studentId: child.id },
        data: {
          lockedByGuardian: false,
          lastChangedBy: guardianUser.name,
        },
      });
    });

    return { removed: true };
  }

  async getChildProgress(userId: string, childId: string): Promise<SubjectProgress[]> {
    await this.getChildForGuardian(userId, childId);
    return this.buildSubjectProgress(childId);
  }

  async getChildSubjects(userId: string, childId: string) {
    const progress = await this.getChildProgress(userId, childId);
    return progress.map((subjectProgress) => ({
      name: subjectProgress.subjectName,
      strengthLevel: subjectProgress.strengthLevel,
    }));
  }
  async getChildCompanionPayload(
    userId: string,
    childId: string,
  ): Promise<PagePayload<ChildCompanionContent>> {
    const content = await this.buildChildCompanionContent(userId, childId);

    return buildPagePayload(content, {
      permissions: buildGuardianChildPermissions(childId),
    });
  }

  async updateChildCompanionControls(
    userId: string,
    childId: string,
    dto: UpdateChildCompanionControlsDto,
  ): Promise<CompanionControls> {
    const [{ guardianUser }, child] = await Promise.all([
      this.getGuardianContext(userId),
      this.getChildForGuardian(userId, childId),
    ]);

    const companionControls = await this.prisma.companionControls.upsert({
      where: { studentId: child.id },
      update: {
        showCorrectAnswers: dto.showCorrectAnswers,
        allowHints: dto.allowHints,
        allowSkip: dto.allowSkip,
        lockedByGuardian: true,
        lastChangedBy: guardianUser.name,
      },
      create: {
        studentId: child.id,
        showCorrectAnswers: dto.showCorrectAnswers,
        allowHints: dto.allowHints,
        allowSkip: dto.allowSkip,
        lockedByGuardian: true,
        lastChangedBy: guardianUser.name,
      },
    });

    await this.prisma.user.update({
      where: { id: child.id },
      data: {
        lockedSettings: ensureSettingLocked(child.lockedSettings, 'companion-controls'),
      },
    });

    return mapCompanionControls(companionControls);
  }

  async updateChildSettings(
    userId: string,
    childId: string,
    dto: UpdateChildSettingsDto,
  ): Promise<GuardianManagedChildSettings> {
    await this.getChildForGuardian(userId, childId);

    const updatedChild = await this.prisma.user.update({
      where: { id: childId },
      data: {
        name: dto.name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        streakDays: true,
        lastActiveAt: true,
        learningMode: true,
        appearance: true,
        dailyGoal: true,
        notificationsEnabled: true,
        lockedSettings: true,
      },
    });

    const companionControls = await this.prisma.companionControls.findUnique({
      where: { studentId: childId },
    });

    return mapGuardianManagedChildSettings(updatedChild, companionControls);
  }

  private async buildDashboardContent(userId: string): Promise<GuardianDashboardContent> {
    const guardian = await this.getGuardianByUserId(userId);
    const [children, pendingInvites] = await Promise.all([
      this.listGuardianChildOverviews(guardian.id),
      this.listPendingInvites(userId),
    ]);

    return {
      summary: {
        childrenCount: children.length,
        activeThisWeek: children.filter((child) => isWithinLastDays(child.lastActiveAt, 7)).length,
        pendingInvites: pendingInvites.filter((invite) => invite.status === 'Awaiting acceptance').length,
        averageStreak: children.length
          ? Math.round(children.reduce((total, child) => total + child.streak, 0) / children.length)
          : 0,
      },
      children,
      pendingInvites,
    };
  }

  private async buildChildProfileContent(
    userId: string,
    childId: string,
  ): Promise<ChildProfileContent> {
    const child = await this.getChildForGuardian(userId, childId);
    const progress = await this.buildSubjectProgress(child.id);

    return {
      child: {
        studentId: child.id,
        name: child.name,
        streak: child.streakDays,
        lastActiveAt: child.lastActiveAt?.toISOString() ?? null,
        subjects: progress.map((subjectProgress) => ({
          name: subjectProgress.subjectName,
          strengthLevel: subjectProgress.strengthLevel,
        })),
      },
      progress,
    };
  }

  private async buildChildCompanionContent(
    userId: string,
    childId: string,
  ): Promise<ChildCompanionContent> {
    const child = await this.getChildForGuardian(userId, childId);
    const companionControls = await this.prisma.companionControls.findUnique({
      where: { studentId: child.id },
    });

    return {
      child: {
        studentId: child.id,
        name: child.name,
      },
      controls: companionControls
        ? mapCompanionControls(companionControls)
        : {
            showCorrectAnswers: true,
            allowHints: true,
            allowSkip: false,
            lockedByGuardian: true,
            lastChangedAt: child.updatedAt.toISOString(),
            lastChangedBy: 'Lernard',
          },
    };
  }

  private async listGuardianChildOverviews(
    guardianId: string,
  ): Promise<GuardianChildOverview[]> {
    const children = await this.prisma.user.findMany({
      where: {
        controlledByGuardianId: guardianId,
        deletedAt: null,
      },
      include: {
        subjectProgress: {
          include: { subject: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return children.map((child) => ({
      studentId: child.id,
      name: child.name,
      streak: child.streakDays,
      lastActiveAt: child.lastActiveAt?.toISOString() ?? null,
      subjects: child.subjectProgress.map((subjectProgress) => ({
        name: subjectProgress.subject.name,
        strengthLevel: toSharedStrengthLevel(subjectProgress.strengthLevel),
      })),
    }));
  }

  private async listPendingInvites(userId: string): Promise<PendingInvite[]> {
    const pendingInviteSnapshots = await listPendingInviteSnapshots(this.prisma, userId, 10);
    return pendingInviteSnapshots.map((pendingInviteSnapshot) => ({
      id: pendingInviteSnapshot.id,
      childEmail: pendingInviteSnapshot.childEmail,
      code: pendingInviteSnapshot.code,
      sentAt: pendingInviteSnapshot.createdAt,
      status: pendingInviteSnapshot.usedAt
        ? 'Accepted'
        : new Date(pendingInviteSnapshot.expiresAt) < new Date()
            ? 'Expired'
            : 'Awaiting acceptance',
    }));
  }

  private async buildSubjectProgress(childId: string): Promise<SubjectProgress[]> {
    const progressRecords = await this.prisma.subjectProgress.findMany({
      where: { userId: childId },
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

  private async getGuardianByUserId(userId: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { userId },
    });

    if (!guardian) {
      throw new NotFoundException('Guardian account not found');
    }

    return guardian;
  }

  private async getGuardianContext(userId: string) {
    const [guardian, guardianUser] = await Promise.all([
      this.getGuardianByUserId(userId),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true },
      }),
    ]);

    return { guardian, guardianUser };
  }

  private async getChildForGuardian(userId: string, childId: string) {
    const guardian = await this.getGuardianByUserId(userId);
    const child = await this.prisma.user.findFirst({
      where: {
        id: childId,
        controlledByGuardianId: guardian.id,
        deletedAt: null,
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    return child;
  }
}

function buildGuardianPermissions(children: GuardianChildOverview[]): ScopedPermission[] {
  return children.flatMap((child) => buildGuardianChildPermissions(child.studentId));
}

function buildGuardianChildPermissions(childId: string): ScopedPermission[] {
  return [
    {
      action: 'can_edit_child_settings',
      resourceId: childId,
      resourceType: 'child',
    },
    {
      action: 'can_view_child_progress',
      resourceId: childId,
      resourceType: 'child',
    },
    {
      action: 'can_change_companion_controls',
      resourceId: childId,
      resourceType: 'child',
    },
  ];
}

function generateInviteCode(): string {
  return String(randomInt(100000, 999999));
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function isWithinLastDays(value: string | null, days: number): boolean {
  if (!value) {
    return false;
  }

  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(value).getTime() >= threshold;
}

function mapPendingInvite(invite: {
  id: string;
  childEmail: string | null;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}): PendingInvite {
  return {
    id: invite.id,
    childEmail: invite.childEmail,
    code: invite.code,
    sentAt: invite.createdAt.toISOString(),
    status: invite.usedAt
      ? 'Accepted'
      : invite.expiresAt < new Date()
          ? 'Expired'
          : 'Awaiting acceptance',
  };
}

function mapCompanionControls(companionControls: {
  showCorrectAnswers: boolean;
  allowHints: boolean;
  allowSkip: boolean;
  lockedByGuardian: boolean;
  lastChangedAt: Date;
  lastChangedBy: string;
}): CompanionControls {
  return {
    showCorrectAnswers: companionControls.showCorrectAnswers,
    allowHints: companionControls.allowHints,
    allowSkip: companionControls.allowSkip,
    lockedByGuardian: companionControls.lockedByGuardian,
    lastChangedAt: companionControls.lastChangedAt.toISOString(),
    lastChangedBy: companionControls.lastChangedBy,
  };
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

function ensureSettingLocked(existingSettings: string[], settingKey: string): string[] {
  return existingSettings.includes(settingKey)
    ? existingSettings
    : [...existingSettings, settingKey];
}

function mapGuardianManagedChildSettings(
  child: {
    id: string;
    email: string | null;
    name: string;
    streakDays: number;
    lastActiveAt: Date | null;
    learningMode: string;
    appearance: string;
    dailyGoal: number;
    notificationsEnabled: boolean;
    lockedSettings: string[];
  },
  companionControls: {
    showCorrectAnswers: boolean;
    allowHints: boolean;
    allowSkip: boolean;
    lockedByGuardian: boolean;
    lastChangedAt: Date;
    lastChangedBy: string;
  } | null,
): GuardianManagedChildSettings {
  return {
    studentId: child.id,
    name: child.name,
    email: child.email,
    streak: child.streakDays,
    lastActiveAt: child.lastActiveAt?.toISOString() ?? null,
    settings: {
      learningMode: toSharedLearningMode(child.learningMode),
      appearance: toSharedAppearance(child.appearance),
      dailyGoal: child.dailyGoal,
      notificationsEnabled: child.notificationsEnabled,
    },
    lockedSettings: child.lockedSettings,
    companionControls: companionControls ? mapCompanionControls(companionControls) : null,
  };
}
