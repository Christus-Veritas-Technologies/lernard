import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Appearance,
  CompanionControls,
  GuardianManagedChildSettings,
  PagePayload,
  Role,
  ScopedPermission,
  SettingsContent,
  SettingsViewerSummary,
  UserSettings,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import {
  toPrismaLearningMode,
  toSharedAppearance,
  toSharedLearningMode,
  toSharedPlan,
  toSharedRole,
  toSharedSessionDepth,
} from '../../common/utils/shared-model-mappers';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<UserSettings> {
    return this.getUserSettings(userId);
  }

  async getPayload(userId: string): Promise<PagePayload<SettingsContent>> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        lockedSettings: true,
      },
    });

    const viewer = mapViewerSummary(user);
    const role = toSharedRole(user.role);

    if (role === 'guardian') {
      const guardian = await this.prisma.guardian.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!guardian) {
        throw new NotFoundException('Guardian account not found');
      }

      const children = await this.listGuardianManagedChildren(guardian.id);

      return buildPagePayload(
        {
          roleView: 'guardian',
          viewer,
          children,
        },
        {
          permissions: buildGuardianSettingsPermissions(children),
        },
      );
    }

    const settings = await this.getUserSettings(userId);

    return buildPagePayload(
      {
        roleView: 'student',
        viewer,
        settings,
        lockedSettings: user.lockedSettings,
      },
      {
        permissions: buildStudentSettingsPermissions(user.lockedSettings),
      },
    );
  }

  async updateMode(userId: string, mode: 'guide' | 'companion'): Promise<UserSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { learningMode: toPrismaLearningMode(mode) },
    });

    return this.get(userId);
  }

  async updateCompanionControls(
    userId: string,
    dto: {
      showCorrectAnswers: boolean;
      allowHints: boolean;
      allowSkip: boolean;
    },
  ): Promise<CompanionControls> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        controlledByGuardianId: true,
      },
    });

    const companionControls = await this.prisma.companionControls.upsert({
      where: { studentId: userId },
      update: {
        showCorrectAnswers: dto.showCorrectAnswers,
        allowHints: dto.allowHints,
        allowSkip: dto.allowSkip,
        lockedByGuardian: Boolean(user.controlledByGuardianId),
        lastChangedBy: user.name,
      },
      create: {
        studentId: userId,
        showCorrectAnswers: dto.showCorrectAnswers,
        allowHints: dto.allowHints,
        allowSkip: dto.allowSkip,
        lockedByGuardian: Boolean(user.controlledByGuardianId),
        lastChangedBy: user.name,
      },
    });

    return mapCompanionControls(companionControls);
  }

  async updateAppearance(
    userId: string,
    appearance: 'light' | 'dark' | 'system',
  ): Promise<UserSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { appearance },
    });

    return this.get(userId);
  }

  async updateDailyGoal(userId: string, target: number): Promise<UserSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { dailyGoal: target },
    });

    return this.get(userId);
  }

  private async getUserSettings(userId: string): Promise<UserSettings> {
    const [user, companionControls] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          learningMode: true,
          appearance: true,
          preferredDepth: true,
          dailyGoal: true,
          sessionLength: true,
          notificationsEnabled: true,
        },
      }),
      this.prisma.companionControls.findUnique({ where: { studentId: userId } }),
    ]);

    return {
      learningMode: toSharedLearningMode(user.learningMode),
      appearance: toSharedAppearance(user.appearance),
      preferredDepth: toSharedSessionDepth(user.preferredDepth),
      dailyGoal: user.dailyGoal,
      preferredSessionLength: user.sessionLength,
      notificationsEnabled: user.notificationsEnabled,
      companionControls: companionControls ? mapCompanionControls(companionControls) : null,
    };
  }

  private async listGuardianManagedChildren(
    guardianId: string,
  ): Promise<GuardianManagedChildSettings[]> {
    const children = await this.prisma.user.findMany({
      where: {
        controlledByGuardianId: guardianId,
        deletedAt: null,
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
      orderBy: { name: 'asc' },
    });

    const companionControls = await this.prisma.companionControls.findMany({
      where: {
        studentId: {
          in: children.map((child) => child.id),
        },
      },
    });

    const controlsByStudentId = new Map(
      companionControls.map((entry) => [entry.studentId, entry]),
    );

    return children.map((child) => ({
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
      companionControls: controlsByStudentId.has(child.id)
        ? mapCompanionControls(controlsByStudentId.get(child.id)!)
        : null,
    }));
  }
}

function buildStudentSettingsPermissions(lockedSettings: string[]): ScopedPermission[] {
  return lockedSettings.includes('mode') ? [] : [{ action: 'can_edit_mode' }];
}

function buildGuardianSettingsPermissions(
  children: GuardianManagedChildSettings[],
): ScopedPermission[] {
  return children.flatMap((child) => [
    {
      action: 'can_edit_child_settings' as const,
      resourceId: child.studentId,
      resourceType: 'child' as const,
    },
    {
      action: 'can_change_companion_controls' as const,
      resourceId: child.studentId,
      resourceType: 'child' as const,
    },
  ]);
}

function mapViewerSummary(user: {
  id: string;
  email: string | null;
  name: string;
  plan: Parameters<typeof toSharedPlan>[0];
  role: Parameters<typeof toSharedRole>[0];
}): SettingsViewerSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: toSharedPlan(user.plan),
    role: toSharedRole(user.role),
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
