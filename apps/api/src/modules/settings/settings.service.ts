import { Injectable } from '@nestjs/common';
import type {
  Appearance,
  CompanionControls,
  PagePayload,
  ScopedPermission,
  SettingsContent,
  UserSettings,
} from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import {
  toPrismaLearningMode,
  toSharedAppearance,
  toSharedLearningMode,
  toSharedSessionDepth,
} from '../../common/utils/shared-model-mappers';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<UserSettings> {
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

  async getPayload(userId: string): Promise<PagePayload<SettingsContent>> {
    const [settings, user] = await Promise.all([
      this.get(userId),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          lockedSettings: true,
        },
      }),
    ]);

    return buildPagePayload(
      {
        settings,
        lockedSettings: user.lockedSettings,
      },
      {
        permissions: buildSettingsPermissions(user.lockedSettings),
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
}

function buildSettingsPermissions(lockedSettings: string[]): ScopedPermission[] {
  return lockedSettings.includes('mode') ? [] : [{ action: 'can_edit_mode' }];
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
