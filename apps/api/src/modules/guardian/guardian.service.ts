import { randomInt, randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { MailService } from '../auth/mail.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

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

  async inviteChild(
    userId: string,
    dto: InviteChildDto,
  ): Promise<{
    type: 'existing_account' | 'new_account';
    code?: string;
    expiresAt?: string;
    childEmail: string;
    childName: string | null;
    setupEmailSent?: boolean;
  }> {
    const { guardian, guardianUser } = await this.getGuardianContext(userId);
    const email = dto.email.toLowerCase();
    const childName = dto.childName?.trim() ?? null;
    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';

    // Guard: linked + pending < 3
    const [linkedCount, pendingCount] = await Promise.all([
      this.prisma.user.count({ where: { controlledByGuardianId: guardian.id, deletedAt: null } }),
      this.prisma.childInvite.count({
        where: { guardianId: guardian.id, status: 'pending', expiresAt: { gt: new Date() } },
      }),
    ]);
    if (linkedCount + pendingCount >= 3) {
      throw new BadRequestException("You've reached the maximum of 3 children on your plan.");
    }

    // Guard: self-invite
    if (guardianUser.email?.toLowerCase() === email) {
      throw new BadRequestException("You can't invite yourself.");
    }

    // Guard: already linked
    const alreadyLinked = await this.prisma.user.findFirst({
      where: { email, controlledByGuardianId: guardian.id, deletedAt: null },
    });
    if (alreadyLinked) {
      throw new BadRequestException('This child is already linked to your account.');
    }

    // Return existing pending invite if one exists
    const existingInvite = await this.prisma.childInvite.findFirst({
      where: { guardianId: guardian.id, childEmail: email, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      return {
        type: existingInvite.type as 'existing_account',
        code: existingInvite.code,
        expiresAt: existingInvite.expiresAt.toISOString(),
        childEmail: email,
        childName,
      };
    }

    // Check if a student account exists for this email
    const existingStudent = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true },
    });

    if (existingStudent) {
      // Path A: existing account
      const code = generateInviteCode();
      const expiresAt = hoursFromNow(24);
      await this.prisma.childInvite.create({
        data: {
          guardianId: guardian.id,
          childEmail: email,
          childId: existingStudent.id,
          type: 'existing_account',
          status: 'pending',
          code,
          expiresAt,
        },
      });
      const acceptLink = `${webUrl}/accept-invite?token=${encodeURIComponent(code)}`;
      await this.mailService.sendInviteExistingAccount(email, {
        guardianName: guardianUser.name,
        code,
        expiresAt,
        acceptLink,
      });
      return {
        type: 'existing_account',
        code,
        expiresAt: expiresAt.toISOString(),
        childEmail: email,
        childName: childName ?? existingStudent.name,
      };
    }

    // Path B: no account — create pending_setup student
    const setupToken = randomUUID();
    const setupTokenExpiresAt = hoursFromNow(48);
    const newChild = await this.prisma.user.create({
      data: {
        email,
        name: childName ?? 'Student',
        role: 'STUDENT' as any,
        accountStatus: 'PENDING_SETUP',
        setupToken,
        setupTokenExpiresAt,
        controlledByGuardianId: guardian.id,
      },
    });
    await this.prisma.childInvite.create({
      data: {
        guardianId: guardian.id,
        childEmail: email,
        childId: newChild.id,
        type: 'new_account',
        status: 'accepted',
        code: generateInviteCode(),
        expiresAt: hoursFromNow(48),
        usedAt: new Date(),
      },
    });
    const setupLink = `${webUrl}/setup?token=${encodeURIComponent(setupToken)}`;
    await this.mailService.sendInviteNewAccount(email, {
      guardianName: guardianUser.name,
      childName: childName ?? 'there',
      setupLink,
      childEmail: email,
    });
    return {
      type: 'new_account',
      childEmail: email,
      childName,
      setupEmailSent: true,
    };
  }

  async getPendingInviteForMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    const invite = await (this.prisma.childInvite as any).findFirst({
      where: {
        status: 'pending',
        expiresAt: { gt: new Date() },
        OR: [
          { childId: userId },
          ...(user.email ? [{ childEmail: user.email }] : []),
        ],
      },
      include: { guardian: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!invite) return { pending: false };

    return {
      pending: true,
      code: invite.code,
      guardianName: (invite.guardian?.user?.name as string | null) ?? 'Your guardian',
    };
  }

  async acceptInvite(userId: string, code: string) {
    const invite = await this.prisma.childInvite.findFirst({
      where: { code, status: 'pending', expiresAt: { gt: new Date() } },
      include: { guardian: { include: { children: false } } },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    const [guardianUser, child] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: invite.guardian.userId },
        select: { email: true },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { controlledByGuardianId: invite.guardianId },
      });
      await tx.companionControls.upsert({
        where: { studentId: userId },
        update: { lockedByGuardian: true, lastChangedBy: 'Guardian' },
        create: { studentId: userId, lockedByGuardian: true, lastChangedBy: 'Guardian' },
      });
      await tx.childInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), status: 'accepted' },
      });
    });

    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';
    if (guardianUser.email) {
      await this.mailService.sendInviteAccepted(guardianUser.email, {
        childName: child.name,
        profileLink: `${webUrl}/guardian/${userId}`,
      });
    }

    return { linked: true };
  }

  async declineInvite(userId: string, code: string) {
    const invite = await this.prisma.childInvite.findFirst({
      where: { code, status: 'pending', expiresAt: { gt: new Date() } },
      include: { guardian: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    const [guardianUser, student] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: invite.guardian.userId },
        select: { email: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      }),
    ]);

    await this.prisma.childInvite.update({
      where: { id: invite.id },
      data: { status: 'declined' },
    });

    if (guardianUser.email) {
      await this.mailService.sendInviteDeclined(guardianUser.email, {
        childEmail: student.email ?? invite.childEmail ?? 'the student',
      });
    }

    return { declined: true };
  }

  async getPending(userId: string): Promise<PendingInvite[]> {
    return this.listPendingInvites(userId);
  }

  async cancelInvite(userId: string, token: string) {
    const guardian = await this.getGuardianByUserId(userId);
    const invite = await this.prisma.childInvite.findFirst({
      where: { guardianId: guardian.id, OR: [{ id: token }, { code: token }] },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.childInvite.update({
      where: { id: invite.id },
      data: { status: 'cancelled' },
    });

    return { cancelled: true };
  }

  async resendInvite(userId: string, token: string): Promise<PendingInvite> {
    const { guardianUser } = await this.getGuardianContext(userId);
    const guardian = await this.getGuardianByUserId(userId);
    const existingInvite = await this.prisma.childInvite.findFirst({
      where: {
        guardianId: guardian.id,
        status: 'pending',
        OR: [{ id: token }, { code: token }],
      },
    });

    if (!existingInvite) {
      throw new NotFoundException('Invite not found');
    }

    const newExpiresAt = hoursFromNow(24);
    const updatedInvite = await this.prisma.childInvite.update({
      where: { id: existingInvite.id },
      data: { expiresAt: newExpiresAt },
    });

    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';
    if (existingInvite.childEmail) {
      const acceptLink = `${webUrl}/accept-invite?token=${encodeURIComponent(existingInvite.code)}`;
      await this.mailService.sendInviteExistingAccount(existingInvite.childEmail, {
        guardianName: guardianUser.name,
        code: existingInvite.code,
        expiresAt: newExpiresAt,
        acceptLink,
      });
    }

    return mapPendingInvite(updatedInvite);
  }

  async resendSetup(userId: string, childId: string) {
    const [{ guardianUser }, child] = await Promise.all([
      this.getGuardianContext(userId),
      this.getChildForGuardian(userId, childId),
    ]);

    if ((child as any).accountStatus !== 'PENDING_SETUP') {
      throw new BadRequestException('Child account is already active.');
    }

    const setupToken = randomUUID();
    const setupTokenExpiresAt = hoursFromNow(48);
    await this.prisma.user.update({
      where: { id: childId },
      data: { setupToken, setupTokenExpiresAt, setupReminderSentAt: null } as any,
    });

    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';
    const setupLink = `${webUrl}/setup?token=${encodeURIComponent(setupToken)}`;
    await this.mailService.sendInviteNewAccount(child.email!, {
      guardianName: guardianUser.name,
      childName: child.name,
      setupLink,
      childEmail: child.email!,
    });

    return { sent: true };
  }

  async getChild(
    userId: string,
    childId: string,
  ): Promise<GuardianChildOverview> {
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
    await this.getChildForGuardian(userId, childId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: childId },
        data: { controlledByGuardianId: null, lockedSettings: [] },
      });
      await tx.companionControls.updateMany({
        where: { studentId: childId },
        data: { lockedByGuardian: false },
      });
    });

    return { removed: true };
  }

  async getChildProgress(
    userId: string,
    childId: string,
  ): Promise<SubjectProgress[]> {
    await this.getChildForGuardian(userId, childId);
    return this.buildSubjectProgress(childId);
  }

  async getChildSubjects(userId: string, childId: string) {
    const progress = await this.getChildProgress(userId, childId);
    return progress.map((sp) => ({
      name: sp.subjectName,
      strengthLevel: sp.strengthLevel,
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
    ip: string,
    userAgent: string,
  ): Promise<CompanionControls> {
    const [{ guardian, guardianUser }, child] = await Promise.all([
      this.getGuardianContext(userId),
      this.getChildForGuardian(userId, childId),
    ]);

    // Load current values for audit diff
    const [currentControls, currentChild] = await Promise.all([
      this.prisma.companionControls.findUnique({ where: { studentId: child.id } }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: child.id },
        select: { learningMode: true, lockedSettings: true },
      }),
    ]);

    const newLearningMode = dto.learningMode === 'companion' ? 'COMPANION' : 'GUIDE';

    // Write audit entries for changed fields
    const auditEntries: { setting: string; oldValue: string; newValue: string }[] = [];
    if (currentChild.learningMode !== newLearningMode) {
      auditEntries.push({ setting: 'learningMode', oldValue: currentChild.learningMode, newValue: newLearningMode });
    }
    if (currentControls?.answerRevealTiming !== dto.answerRevealTiming) {
      auditEntries.push({
        setting: 'answerRevealTiming',
        oldValue: currentControls?.answerRevealTiming ?? 'after_quiz',
        newValue: dto.answerRevealTiming,
      });
    }
    if (currentControls?.quizPassThreshold !== dto.quizPassThreshold) {
      auditEntries.push({
        setting: 'quizPassThreshold',
        oldValue: String(currentControls?.quizPassThreshold ?? 0.7),
        newValue: String(dto.quizPassThreshold),
      });
    }
    const oldLocked = JSON.stringify([...(currentChild.lockedSettings ?? [])].sort());
    const newLocked = JSON.stringify([...dto.lockedSettings].sort());
    if (oldLocked !== newLocked) {
      auditEntries.push({ setting: 'lockedSettings', oldValue: oldLocked, newValue: newLocked });
    }

    if (auditEntries.length > 0) {
      await this.prisma.settingsAudit.createMany({
        data: auditEntries.map((entry) => ({
          guardianId: guardian.id,
          studentId: child.id,
          setting: entry.setting,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          ip,
          userAgent,
          createdAt: new Date(),
        })),
      });
    }

    const [companionControls] = await Promise.all([
      this.prisma.companionControls.upsert({
        where: { studentId: child.id },
        update: {
          answerRevealTiming: dto.answerRevealTiming,
          quizPassThreshold: dto.quizPassThreshold,
          lockedByGuardian: true,
          lastChangedBy: guardianUser.name,
        },
        create: {
          studentId: child.id,
          answerRevealTiming: dto.answerRevealTiming,
          quizPassThreshold: dto.quizPassThreshold,
          lockedByGuardian: true,
          lastChangedBy: guardianUser.name,
        },
      }),
      this.prisma.user.update({
        where: { id: child.id },
        data: {
          learningMode: newLearningMode as any,
          lockedSettings: dto.lockedSettings,
          invalidatePermissionsAt: new Date(),
        },
      }),
    ]);

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
      data: { name: dto.name.trim() },
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

  private async buildDashboardContent(
    userId: string,
  ): Promise<GuardianDashboardContent> {
    const guardian = await this.getGuardianByUserId(userId);
    const [children, pendingInvites] = await Promise.all([
      this.listGuardianChildOverviews(guardian.id),
      this.listPendingInvites(userId),
    ]);

    return {
      summary: {
        childrenCount: children.length,
        activeThisWeek: children.filter((child) =>
          isWithinLastDays(child.lastActiveAt, 7),
        ).length,
        pendingInvites: pendingInvites.filter(
          (invite) => invite.status === 'Awaiting acceptance',
        ).length,
        averageStreak: children.length
          ? Math.round(
              children.reduce((total, child) => total + child.streak, 0) /
                children.length,
            )
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
        subjects: progress.map((sp) => ({
          name: sp.subjectName,
          strengthLevel: sp.strengthLevel,
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
    const [companionControls, childUser] = await Promise.all([
      this.prisma.companionControls.findUnique({ where: { studentId: child.id } }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: child.id },
        select: { learningMode: true, lockedSettings: true },
      }),
    ]);

    return {
      child: { studentId: child.id, name: child.name },
      controls: mapCompanionControls(
        companionControls ?? {
          answerRevealTiming: 'after_quiz',
          quizPassThreshold: 0.7,
          lockedByGuardian: true,
          lastChangedAt: child.updatedAt,
          lastChangedBy: 'Lernard',
        },
        childUser.learningMode,
        childUser.lockedSettings,
      ),
    };
  }

  private async listGuardianChildOverviews(
    guardianId: string,
  ): Promise<GuardianChildOverview[]> {
    const children = await this.prisma.user.findMany({
      where: { controlledByGuardianId: guardianId, deletedAt: null },
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
      subjects: child.subjectProgress.map((sp) => ({
        name: sp.subject.name,
        strengthLevel: toSharedStrengthLevel(sp.strengthLevel),
      })),
    }));
  }

  private async listPendingInvites(userId: string): Promise<PendingInvite[]> {
    const snapshots = await listPendingInviteSnapshots(this.prisma, userId, 10);
    return snapshots.map((s) => ({
      id: s.id,
      childEmail: s.childEmail,
      code: s.code,
      sentAt: s.createdAt,
      status: s.usedAt
        ? 'Accepted'
        : new Date(s.expiresAt) < new Date()
          ? 'Expired'
          : 'Awaiting acceptance',
    }));
  }

  private async buildSubjectProgress(childId: string): Promise<SubjectProgress[]> {
    const records = await this.prisma.subjectProgress.findMany({
      where: { userId: childId },
      include: { subject: true },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((r) => ({
      subjectId: r.subjectId,
      subjectName: r.subject.name,
      strengthLevel: toSharedStrengthLevel(r.strengthLevel),
      topics: mapTopicStrengths(r.topicScores, r.updatedAt),
      lastActiveAt: r.updatedAt.toISOString(),
    }));
  }

  private async getGuardianByUserId(userId: string) {
    const guardian = await this.prisma.guardian.findUnique({ where: { userId } });
    if (!guardian) throw new NotFoundException('Guardian account not found');
    return guardian;
  }

  private async getGuardianContext(userId: string) {
    const [guardian, guardianUser] = await Promise.all([
      this.getGuardianByUserId(userId),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, email: true },
      }),
    ]);
    return { guardian, guardianUser };
  }

  private async getChildForGuardian(userId: string, childId: string) {
    const guardian = await this.getGuardianByUserId(userId);
    const child = await this.prisma.user.findFirst({
      where: { id: childId, controlledByGuardianId: guardian.id, deletedAt: null },
    });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async updateGuardianProfile(
    userId: string,
    dto: { name?: string; contactPreference?: 'email' | 'push' | 'both'; dashboardDefault?: 'overview' | 'last_viewed' | 'most_recent' },
  ): Promise<void> {
    const guardian = await this.getGuardianByUserId(userId);
    await Promise.all([
      dto.name !== undefined
        ? this.prisma.user.update({ where: { id: userId }, data: { name: dto.name } })
        : Promise.resolve(),
      (dto.contactPreference !== undefined || dto.dashboardDefault !== undefined)
        ? this.prisma.guardian.update({
            where: { id: guardian.id },
            data: {
              ...(dto.contactPreference !== undefined && { contactPreference: dto.contactPreference }),
              ...(dto.dashboardDefault !== undefined && { dashboardDefault: dto.dashboardDefault }),
            },
          })
        : Promise.resolve(),
    ]);
  }

  async updateGuardianNotifications(
    userId: string,
    dto: { weeklyFamilySummary?: boolean; unsubscribeAll?: boolean; perChildAlerts?: Array<{ childId: string; enabled: boolean; frequency?: string; streakAlert?: boolean }> },
  ): Promise<void> {
    const guardian = await this.getGuardianByUserId(userId);
    if (dto.weeklyFamilySummary !== undefined || dto.unsubscribeAll !== undefined) {
      await this.prisma.guardian.update({
        where: { id: guardian.id },
        data: {
          ...(dto.weeklyFamilySummary !== undefined && { weeklyFamilySummary: dto.weeklyFamilySummary }),
          ...(dto.unsubscribeAll !== undefined && { unsubscribeAll: dto.unsubscribeAll }),
        },
      });
    }
    // perChildAlerts: stored as lockedSettings or future child notification prefs — stored on child user notificationsEnabled for now
    if (dto.perChildAlerts?.length) {
      await Promise.all(
        dto.perChildAlerts.map(async (alert) => {
          const child = await this.getChildForGuardian(userId, alert.childId);
          await this.prisma.user.update({
            where: { id: child.id },
            data: { notificationsEnabled: alert.enabled },
          });
        }),
      );
    }
  }
}

function buildGuardianPermissions(
  children: GuardianChildOverview[],
): ScopedPermission[] {
  return children.flatMap((child) => buildGuardianChildPermissions(child.studentId));
}

function buildGuardianChildPermissions(childId: string): ScopedPermission[] {
  return [
    { action: 'can_edit_child_settings', resourceId: childId, resourceType: 'child' },
    { action: 'can_view_child_progress', resourceId: childId, resourceType: 'child' },
    { action: 'can_change_companion_controls', resourceId: childId, resourceType: 'child' },
  ];
}

function generateInviteCode(): string {
  return String(randomInt(100000, 999999));
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function isWithinLastDays(value: string | null, days: number): boolean {
  if (!value) return false;
  return new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
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

function mapCompanionControls(
  controls: {
    answerRevealTiming: string;
    quizPassThreshold: number;
    lockedByGuardian: boolean;
    lastChangedAt: Date;
    lastChangedBy: string;
  },
  learningMode?: string,
  lockedSettings?: string[],
): CompanionControls {
  return {
    showCorrectAnswers: controls.answerRevealTiming === 'immediate',
    allowHints: true,
    allowSkip: false,
    lockedByGuardian: controls.lockedByGuardian,
    lastChangedAt: controls.lastChangedAt.toISOString(),
    lastChangedBy: controls.lastChangedBy,
    // Extended spec fields
    ...(learningMode !== undefined && { learningMode: learningMode === 'COMPANION' ? 'companion' : 'guide' }),
    ...(lockedSettings !== undefined && { lockedSettings }),
    answerRevealTiming: controls.answerRevealTiming as 'after_quiz' | 'immediate',
    quizPassThreshold: controls.quizPassThreshold,
  } as CompanionControls;
}

function mapTopicStrengths(topicScores: unknown, updatedAt: Date): TopicStrength[] {
  if (!topicScores || typeof topicScores !== 'object' || Array.isArray(topicScores)) {
    return [];
  }
  return Object.entries(topicScores)
    .flatMap(([topic, rawScore]) => {
      if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) return [];
      const score = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
      return [{ topic, level: toTopicLevel(score), score, lastTestedAt: updatedAt.toISOString() }];
    })
    .sort((a, b) => b.score - a.score);
}

function toTopicLevel(score: number): TopicStrength['level'] {
  if (score >= 80) return 'confident';
  if (score >= 60) return 'getting_there';
  return 'needs_work';
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
    answerRevealTiming: string;
    quizPassThreshold: number;
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
