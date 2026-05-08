import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { R2Service } from '../../r2/r2.service';
import type {
  Appearance,
  CompanionControls,
  GuardianManagedChildSettings,
  GuardianViewerSummary,
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

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

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
        ageGroup: true,
        grade: true,
        timezone: true,
        learningGoal: true,
        createdAt: true,
        controlledBy: {
          select: {
            id: true,
            createdAt: true,
            userId: true,
          },
        },
      },
    });

    const viewer = mapViewerSummary(user);
    const role = toSharedRole(user.role);

    if (role === 'guardian') {
      const guardian = await this.prisma.guardian.findUnique({
        where: { userId },
        select: {
          id: true,
          contactPreference: true,
          dashboardDefault: true,
          weeklyFamilySummary: true,
          unsubscribeAll: true,
        },
      });

      if (!guardian) {
        throw new NotFoundException('Guardian account not found');
      }

      const children = await this.listGuardianManagedChildren(guardian.id);

      return buildPagePayload(
        {
          roleView: 'guardian',
          viewer: mapGuardianViewerSummary(user, guardian),
          children,
        },
        {
          permissions: buildGuardianSettingsPermissions(children),
        },
      );
    }

    // Resolve guardian name if student is linked
    let guardianName: string | null = null;
    let guardianLinkedSince: string | null = null;
    if (user.controlledBy) {
      const guardianUser = await this.prisma.user.findUnique({
        where: { id: user.controlledBy.userId },
        select: { name: true },
      });
      guardianName = guardianUser?.name ?? null;
      guardianLinkedSince = user.controlledBy.createdAt.toISOString();
    }

    const settings = await this.getUserSettings(userId);

    return buildPagePayload(
      {
        roleView: 'student',
        viewer,
        settings,
        lockedSettings: user.lockedSettings,
        guardianName,
        guardianLinkedSince,
      },
      {
        permissions: buildStudentSettingsPermissions(user.lockedSettings),
      },
    );
  }

  async updateMode(
    userId: string,
    mode: 'guide' | 'companion',
  ): Promise<UserSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { learningMode: toPrismaLearningMode(mode) },
    });

    return this.get(userId);
  }

  async updateCompanionControls(
    userId: string,
    dto: {
      answerRevealTiming: 'after_quiz' | 'immediate';
      quizPassThreshold: number;
    },
  ): Promise<CompanionControls> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        controlledByGuardianId: true,
      },
    });

    const companionControls = await (this.prisma.companionControls as any).upsert({
      where: { studentId: userId },
      update: {
        answerRevealTiming: dto.answerRevealTiming,
        quizPassThreshold: dto.quizPassThreshold,
        lockedByGuardian: Boolean(user.controlledByGuardianId),
        lastChangedBy: user.name,
      },
      create: {
        studentId: userId,
        answerRevealTiming: dto.answerRevealTiming,
        quizPassThreshold: dto.quizPassThreshold,
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

  async uploadAvatar(
    userId: string,
    file:
      | { buffer: Buffer; mimetype: string; originalname: string }
      | undefined,
  ): Promise<{ profilePictureUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    const ext = ALLOWED_AVATAR_TYPES[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'Only JPEG, PNG, WEBP, and GIF images are allowed.',
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('The uploaded file was empty.');
    }

    const originalExt = extname(file.originalname).toLowerCase() || ext;
    const key = `profile-pictures/${userId}/${randomUUID()}${originalExt}`;
    await this.r2.upload(key, file.buffer, file.mimetype);

    const profilePictureUrl = this.r2.getPublicUrl(key);

    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl },
    });

    return { profilePictureUrl };
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
          supportLevel: true,
          textSize: true,
          reducedMotion: true,
          reminderEnabled: true,
          reminderTime: true,
          streakAlertEnabled: true,
          growthAreaNudgeEnabled: true,
          growthAreaNudgeFrequency: true,
          planLimitAlertEnabled: true,
          weeklyEmailEnabled: true,
          plan: true,
        },
      }),
      this.prisma.companionControls.findUnique({
        where: { studentId: userId },
      }),
    ]);

    return {
      learningMode: toSharedLearningMode(user.learningMode),
      appearance: toSharedAppearance(user.appearance),
      preferredDepth: toSharedSessionDepth(user.preferredDepth),
      dailyGoal: user.dailyGoal,
      preferredSessionLength: user.sessionLength,
      notificationsEnabled: user.notificationsEnabled,
      supportLevel: (user.supportLevel as 'minimal' | 'moderate' | 'full') ?? 'moderate',
      textSize: (user.textSize as 'small' | 'medium' | 'large' | 'xl') ?? 'medium',
      reducedMotion: user.reducedMotion ?? false,
      reminderEnabled: user.reminderEnabled ?? true,
      reminderTime: user.reminderTime ?? '07:00',
      streakAlertEnabled: user.streakAlertEnabled ?? true,
      growthAreaNudgeEnabled: user.growthAreaNudgeEnabled ?? true,
      growthAreaNudgeFrequency: (user.growthAreaNudgeFrequency as 'daily' | 'weekly' | 'in_app_only') ?? 'daily',
      planLimitAlertEnabled: user.planLimitAlertEnabled ?? true,
      weeklyEmailEnabled: user.weeklyEmailEnabled ?? true,
      companionControls: companionControls
        ? mapCompanionControls(companionControls)
        : null,
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
        async updateProfile(
          userId: string,
          dto: {
            name?: string;
            ageGroup?: string | null;
            grade?: string | null;
            timezone?: string;
            learningGoal?: string | null;
          },
        ): Promise<UserSettings> {
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.ageGroup !== undefined && { ageGroup: dto.ageGroup as any }),
              ...(dto.grade !== undefined && { grade: dto.grade }),
              ...(dto.timezone !== undefined && { timezone: dto.timezone }),
              ...(dto.learningGoal !== undefined && { learningGoal: dto.learningGoal as any }),
            },
          });
          return this.get(userId);
        }

        async updateStudy(
          userId: string,
          dto: {
            learningMode?: 'guide' | 'companion';
            answerRevealTiming?: 'after_quiz' | 'immediate';
            quizPassThreshold?: number;
            sessionLength?: number;
            preferredDepth?: string;
            dailyGoal?: number;
            supportLevel?: 'minimal' | 'moderate' | 'full';
          },
        ): Promise<{ settings: UserSettings; lockedFields: string[] }> {
          const userRecord = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { lockedSettings: true },
          });
          const lockedSettings = userRecord.lockedSettings;
          const lockedFields: string[] = [];

          if (dto.learningMode !== undefined && lockedSettings.includes('mode')) {
            lockedFields.push('learningMode');
          }
          if (
            (dto.answerRevealTiming !== undefined || dto.quizPassThreshold !== undefined) &&
            lockedSettings.includes('companion-controls')
          ) {
            lockedFields.push('answerRevealTiming', 'quizPassThreshold');
          }

          if (lockedFields.length > 0) {
            throw new ForbiddenException({ lockedFields });
          }

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              ...(dto.learningMode !== undefined && {
                learningMode: toPrismaLearningMode(dto.learningMode),
              }),
              ...(dto.sessionLength !== undefined && { sessionLength: dto.sessionLength }),
              ...(dto.preferredDepth !== undefined && { preferredDepth: dto.preferredDepth }),
              ...(dto.dailyGoal !== undefined && { dailyGoal: dto.dailyGoal }),
              ...(dto.supportLevel !== undefined && { supportLevel: dto.supportLevel }),
            },
          });

          // Update companion controls separately if provided
          if (dto.answerRevealTiming !== undefined || dto.quizPassThreshold !== undefined) {
            const user = await this.prisma.user.findUniqueOrThrow({
              where: { id: userId },
              select: { name: true, controlledByGuardianId: true },
            });
            await (this.prisma.companionControls as any).upsert({
              where: { studentId: userId },
              update: {
                ...(dto.answerRevealTiming !== undefined && {
                  answerRevealTiming: dto.answerRevealTiming,
                }),
                ...(dto.quizPassThreshold !== undefined && {
                  quizPassThreshold: dto.quizPassThreshold,
                }),
                lastChangedBy: user.name,
              },
              create: {
                studentId: userId,
                answerRevealTiming: dto.answerRevealTiming ?? 'after_quiz',
                quizPassThreshold: dto.quizPassThreshold ?? 0.7,
                lockedByGuardian: Boolean(user.controlledByGuardianId),
                lastChangedBy: user.name,
              },
            });
          }

          return { settings: await this.get(userId), lockedFields: [] };
        }

        async updateNotifications(
          userId: string,
          dto: {
            reminderEnabled?: boolean;
            reminderTime?: string;
            streakAlertEnabled?: boolean;
            growthAreaNudgeEnabled?: boolean;
            growthAreaNudgeFrequency?: string;
            planLimitAlertEnabled?: boolean;
            weeklyEmailEnabled?: boolean;
          },
        ): Promise<UserSettings> {
          const userRecord = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { plan: true },
          });
          const userPlan = userRecord.plan;
          const data: Record<string, unknown> = {};

          if (dto.reminderEnabled !== undefined) data.reminderEnabled = dto.reminderEnabled;
          if (dto.reminderTime !== undefined) data.reminderTime = dto.reminderTime;
          if (dto.streakAlertEnabled !== undefined) data.streakAlertEnabled = dto.streakAlertEnabled;
          if (dto.growthAreaNudgeEnabled !== undefined) data.growthAreaNudgeEnabled = dto.growthAreaNudgeEnabled;
          if (dto.growthAreaNudgeFrequency !== undefined) data.growthAreaNudgeFrequency = dto.growthAreaNudgeFrequency;
          // Explorer cannot turn off plan limit alerts
          if (dto.planLimitAlertEnabled !== undefined && userPlan !== 'EXPLORER') {
            data.planLimitAlertEnabled = dto.planLimitAlertEnabled;
          }
          if (dto.weeklyEmailEnabled !== undefined) data.weeklyEmailEnabled = dto.weeklyEmailEnabled;

          await this.prisma.user.update({ where: { id: userId }, data });
          return this.get(userId);
        }

        async unlinkGuardian(
          userId: string,
          studentPassword: string,
        ): Promise<{ message: string }> {
          const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { passwordHash: true, controlledByGuardianId: true },
          });

          if (!user.controlledByGuardianId) {
            throw new BadRequestException('No linked guardian found.');
          }

          if (!user.passwordHash) {
            throw new BadRequestException(
              'Your account uses social login. You cannot unlink with a password.',
            );
          }

          const bcrypt = await import('bcrypt');
          const valid = await bcrypt.compare(studentPassword, user.passwordHash);
          if (!valid) {
            throw new UnauthorizedException('Incorrect password.');
          }

          await this.prisma.user.update({
            where: { id: userId },
            data: {
              controlledByGuardianId: null,
              lockedSettings: [],
            },
          });

          return { message: 'Guardian unlinked.' };
        }

        async deleteAccount(
          userId: string,
          password: string,
        ): Promise<{ message: string }> {
          const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { passwordHash: true },
          });

          if (!user.passwordHash) {
            throw new BadRequestException(
              'Your account uses social login. Contact support to delete it.',
            );
          }

          const bcrypt = await import('bcrypt');
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            throw new UnauthorizedException('Incorrect password.');
          }

          // Revoke all refresh tokens
          await this.prisma.refreshToken.deleteMany({ where: { userId } });

          // Soft-delete
          await this.prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() },
          });

          return { message: 'Account deleted.' };
        }

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
        ? mapCompanionControls(controlsByStudentId.get(child.id))
        : null,
    }));
  }
}

function buildStudentSettingsPermissions(
  lockedSettings: string[],
): ScopedPermission[] {
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
  ageGroup?: string | null;
  grade?: string | null;
  timezone?: string;
  learningGoal?: string | null;
}): SettingsViewerSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: toSharedPlan(user.plan),
    role: toSharedRole(user.role),
    ageGroup: (user.ageGroup as any) ?? null,
    grade: user.grade ?? null,
    timezone: user.timezone ?? 'UTC',
    learningGoal: (user.learningGoal as any) ?? null,
  };
}

function mapGuardianViewerSummary(
  user: {
    id: string;
    email: string | null;
    name: string;
    plan: Parameters<typeof toSharedPlan>[0];
    role: Parameters<typeof toSharedRole>[0];
  },
  guardian: { contactPreference?: string; dashboardDefault?: string; weeklyFamilySummary?: boolean; unsubscribeAll?: boolean },
): GuardianViewerSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: toSharedPlan(user.plan),
    role: toSharedRole(user.role),
    contactPreference: (guardian.contactPreference as 'email' | 'push' | 'both') ?? 'email',
    dashboardDefault: (guardian.dashboardDefault as 'overview' | 'last_viewed' | 'most_recent') ?? 'overview',
    weeklyFamilySummary: guardian.weeklyFamilySummary ?? true,
    unsubscribeAll: guardian.unsubscribeAll ?? false,
  };
}

function mapCompanionControls(companionControls: any): CompanionControls {
  return {
    answerRevealTiming: companionControls.answerRevealTiming ?? 'after_quiz',
    quizPassThreshold: companionControls.quizPassThreshold ?? 0.7,
    lockedByGuardian: companionControls.lockedByGuardian,
    lastChangedAt: (companionControls.lastChangedAt as Date).toISOString(),
    lastChangedBy: companionControls.lastChangedBy,
  };
}
