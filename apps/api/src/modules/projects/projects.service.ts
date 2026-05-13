import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  PagePayload,
  ProjectContent,
  ProjectDraft,
  ProjectGenerationStatus,
  ProjectLevel,
  ProjectSection,
  ProjectsContent,
  ProjectStatusResponse,
  ScopedPermission,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { buildPagePayload } from '../../common/utils/build-page-payload';
import { MastraService } from '../../mastra/mastra.service';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../r2/r2.service';
import {
  CreateProjectDraftDto,
  EditProjectPdfDto,
  GenerateProjectDto,
  UpdateProjectDraftDto,
} from './dto/projects.dto';
import { getProjectLayout } from './project-layouts';
import { getProjectLevelLanguageProfile } from './project-level-language';
import { ProjectPdfRendererService } from './project-pdf-renderer.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly projectPdfRenderer: ProjectPdfRendererService,
    private readonly mastra: MastraService,
  ) {}

  async getPayload(user: User): Promise<PagePayload<ProjectsContent>> {
    const [recentProjectsResult, recentDraftsResult] = await Promise.allSettled([
      (this.prisma as any).project.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      (this.prisma as any).projectDraft.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);

    const recentProjects =
      recentProjectsResult.status === 'fulfilled' ? recentProjectsResult.value : [];
    const recentDrafts =
      recentDraftsResult.status === 'fulfilled' ? recentDraftsResult.value : [];

    if (recentProjectsResult.status === 'rejected') {
      this.logger.warn(
        `Projects list unavailable for user ${user.id}: ${String(recentProjectsResult.reason)}`,
      );
    }
    if (recentDraftsResult.status === 'rejected') {
      this.logger.warn(
        `Project drafts unavailable for user ${user.id}: ${String(recentDraftsResult.reason)}`,
      );
    }

    const content: ProjectsContent = {
      totalProjects: recentProjects.length,
      readyProjects: recentProjects.filter((project: any) => project.status === 'READY')
        .length,
      generatingProjects: recentProjects.filter(
        (project: any) =>
          project.status === 'QUEUED' || project.status === 'PROCESSING',
      ).length,
      failedProjects: recentProjects.filter((project: any) => project.status === 'FAILED')
        .length,
      draftsInProgress: recentDrafts.length,
      recentProjects: recentProjects.slice(0, 10).map((project: any) => ({
        projectId: project.id,
        title: project.title,
        templateName: project.templateName,
        subject: project.subjectName,
        level: toSharedLevel(project.level),
        status: toSharedStatus(project.status),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        pdfReadyAt: project.pdfReadyAt ? project.pdfReadyAt.toISOString() : null,
      })),
      drafts: recentDrafts.map((draft: any) => toDraftResponse(draft)),
    };

    return buildPagePayload(content, {
      permissions: buildProjectPermissions(),
    });
  }

  listTemplates(_level?: ProjectLevel): never[] {
    return [];
  }

  async createDraft(user: User, dto: CreateProjectDraftDto): Promise<ProjectDraft> {
    const layout = getProjectLayout(dto.level);

    const draft = await (this.prisma as any).projectDraft.create({
      data: {
        userId: user.id,
        templateId: layout.id,
        subjectName: dto.subject,
        level: toDbLevel(dto.level),
        topicHint: null,
        studentInfo: dto.studentInfo,
        context: {},
      },
    });

    return toDraftResponse(draft);
  }

  async updateDraft(
    user: User,
    draftId: string,
    dto: UpdateProjectDraftDto,
  ): Promise<ProjectDraft> {
    const existing = await (this.prisma as any).projectDraft.findFirst({
      where: {
        id: draftId,
        userId: user.id,
      },
    });

    if (!existing) {
      throw new NotFoundException('Project draft not found.');
    }

    const nextLevel = dto.level ?? toSharedLevel(existing.level);
    const nextLayout = getProjectLayout(nextLevel);

    const draft = await (this.prisma as any).projectDraft.update({
      where: { id: draftId },
      data: {
        templateId: nextLayout.id,
        subjectName: dto.subject ?? existing.subjectName,
        level: dto.level ? toDbLevel(dto.level) : existing.level,
        studentInfo: dto.studentInfo ?? existing.studentInfo,
      },
    });

    return toDraftResponse(draft);
  }

  async getDraft(user: User, draftId: string): Promise<ProjectDraft> {
    const draft = await (this.prisma as any).projectDraft.findFirst({
      where: { id: draftId, userId: user.id },
    });
    if (!draft) {
      throw new NotFoundException('Project draft not found.');
    }
    return toDraftResponse(draft);
  }

  async generateFromDraft(
    user: User,
    dto: GenerateProjectDto,
  ): Promise<{ projectId: string; status: ProjectGenerationStatus }> {
    const existing = await (this.prisma as any).project.findFirst({
      where: {
        userId: user.id,
        idempotencyKey: dto.idempotencyKey,
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return { projectId: existing.id, status: toSharedStatus(existing.status) };
    }

    const draft = await (this.prisma as any).projectDraft.findFirst({
      where: {
        id: dto.draftId,
        userId: user.id,
      },
    });
    if (!draft) {
      throw new NotFoundException('Project draft not found.');
    }

    const sharedLevel = toSharedLevel(draft.level);
    const layout = getProjectLayout(sharedLevel);
    const jobId = uuidv4();

    const queuedProject = await (this.prisma as any).project.create({
      data: {
        userId: user.id,
        draftId: draft.id,
        templateId: layout.id,
        templateName: layout.name,
        title: `${layout.name}: ${draft.subjectName}`,
        subjectName: draft.subjectName,
        level: draft.level,
        totalMarks: 0,
        status: 'QUEUED',
        jobId,
        idempotencyKey: dto.idempotencyKey,
      },
      select: { id: true },
    });

    void this.runProjectGenerationJob({
      projectId: queuedProject.id,
      userId: user.id,
      jobId,
      draft,
      layout,
    });

    return { projectId: queuedProject.id, status: 'queued' };
  }

  private async runProjectGenerationJob(input: {
    projectId: string;
    userId: string;
    jobId: string;
    draft: any;
    layout: import('./project-layouts').ProjectLayoutDefinition;
  }): Promise<void> {
    try {
      const claimed = await (this.prisma as any).project.updateMany({
        where: {
          id: input.projectId,
          userId: input.userId,
          jobId: input.jobId,
          status: 'QUEUED',
        },
        data: {
          status: 'PROCESSING',
        },
      });

      if (claimed.count === 0) {
        this.logger.warn(
          `[project.generate] skipped stale job projectId=${input.projectId} userId=${input.userId} jobId=${input.jobId}`,
        );
        return;
      }

      const sharedLevel = toSharedLevel(input.draft.level);
      const languageProfile = getProjectLevelLanguageProfile(sharedLevel);
      const studentInfo = input.draft.studentInfo as {
        fullName: string;
        schoolName: string;
        candidateNumber: string;
        centreNumber: string;
      };

      const aiResult = await this.mastra.generateProjectContent({
        studentInfo,
        subject: input.draft.subjectName,
        level: sharedLevel,
        layoutSections: input.layout.sections,
        languageProfile,
      });

      const sections = aiResult.sections;
      const title = aiResult.title;
      const totalMarks = aiResult.totalMarks;

      const pdfBuffer = await this.projectPdfRenderer.render({
        projectId: input.projectId,
        title,
        templateName: input.layout.name,
        subject: input.draft.subjectName,
        level: sharedLevel,
        totalMarks,
        sections,
      });

      const pdfObjectKey = buildProjectPdfObjectKey(input.userId, input.projectId);
      const pdfFileName = buildProjectPdfFileName({
        subjectName: input.draft.subjectName,
        level: sharedLevel,
      });
      await this.r2.upload(pdfObjectKey, pdfBuffer, 'application/pdf');
      const readyAt = new Date();

      const markedReady = await (this.prisma as any).project.updateMany({
        where: {
          id: input.projectId,
          userId: input.userId,
          jobId: input.jobId,
          status: 'PROCESSING',
        },
        data: {
          status: 'READY',
          title,
          totalMarks,
          sections,
          readyAt,
          pdfReadyAt: readyAt,
          pdfObjectKey,
          pdfFileName,
          failedAt: null,
          failureReason: null,
        },
      });

      if (markedReady.count === 0) {
        this.logger.warn(
          `[project.generate] skipped ready update for stale job projectId=${input.projectId} userId=${input.userId} jobId=${input.jobId}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';

      this.logger.error(
        `[project.generate] failed projectId=${input.projectId} userId=${input.userId} jobId=${input.jobId} error="${message}"`,
        error instanceof Error ? error.stack : undefined,
      );

      await (this.prisma as any).project.updateMany({
        where: {
          id: input.projectId,
          userId: input.userId,
          jobId: input.jobId,
          status: {
            in: ['QUEUED', 'PROCESSING'],
          },
        },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: message.slice(0, 500),
        },
      });
    }
  }

  async getProject(user: User, projectId: string): Promise<ProjectContent> {
    const project = await (this.prisma as any).project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return toProjectContent(project);
  }

  async getProjectStatus(
    user: User,
    projectId: string,
  ): Promise<ProjectStatusResponse> {
    const project = await (this.prisma as any).project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      select: {
        status: true,
        failureReason: true,
        pdfReadyAt: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return {
      status: toSharedStatus(project.status),
      failureReason: project.failureReason ?? null,
      pdfReady: Boolean(project.pdfReadyAt),
    };
  }

  async getProjectDownload(user: User, projectId: string): Promise<{
    fileName: string;
    downloadUrl: string;
  }> {
    const project = await (this.prisma as any).project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      select: {
        status: true,
        pdfObjectKey: true,
        pdfFileName: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    if (project.status !== 'READY' || !project.pdfObjectKey || !project.pdfFileName) {
      throw new BadRequestException('Project PDF is not ready yet.');
    }

    return {
      fileName: project.pdfFileName,
      downloadUrl: this.r2.getPublicUrl(project.pdfObjectKey),
    };
  }

  async editProjectPdf(
    user: User,
    projectId: string,
    dto: EditProjectPdfDto,
  ): Promise<ProjectContent> {
    const project = await (this.prisma as any).project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    if (project.status !== 'READY') {
      throw new BadRequestException('Only ready projects can be edited.');
    }

    const existingSections = normalizeProjectSections(project.sections);
    if (existingSections.length === 0) {
      throw new BadRequestException('Project sections are not available for editing.');
    }

    const editedSections = normalizeEditedSections(dto.sections, existingSections);
    const nextTitle = dto.title?.trim() ?? project.title;
    const sharedLevel = toSharedLevel(project.level);

    const pdfBuffer = await this.projectPdfRenderer.render({
      projectId: project.id,
      title: nextTitle,
      templateName: project.templateName,
      subject: project.subjectName,
      level: sharedLevel,
      totalMarks: project.totalMarks,
      sections: editedSections,
    });

    const pdfObjectKey = project.pdfObjectKey
      ? project.pdfObjectKey
      : buildProjectPdfObjectKey(user.id, project.id);
    const pdfFileName = buildProjectPdfFileNameFromTitle(nextTitle, sharedLevel);

    await this.r2.upload(pdfObjectKey, pdfBuffer, 'application/pdf');

    const updated = await (this.prisma as any).project.update({
      where: { id: project.id },
      data: {
        title: nextTitle,
        sections: editedSections,
        pdfReadyAt: new Date(),
        pdfObjectKey,
        pdfFileName,
      },
    });

    return toProjectContent(updated);
  }
}

function buildProjectPermissions(): ScopedPermission[] {
  return [{ action: 'can_start_project' }, { action: 'can_download_project' }];
}

function toDbLevel(level: ProjectLevel): 'GRADE7' | 'OLEVEL' | 'ALEVEL' {
  if (level === 'grade7') {
    return 'GRADE7';
  }
  if (level === 'olevel') {
    return 'OLEVEL';
  }
  return 'ALEVEL';
}

function toSharedLevel(level: string): ProjectLevel {
  if (level === 'GRADE7') {
    return 'grade7';
  }
  if (level === 'OLEVEL') {
    return 'olevel';
  }
  return 'alevel';
}

function toSharedStatus(status: string): ProjectGenerationStatus {
  if (status === 'PROCESSING') {
    return 'processing';
  }
  if (status === 'READY') {
    return 'ready';
  }
  if (status === 'FAILED') {
    return 'failed';
  }
  return 'queued';
}

function toDraftResponse(draft: any): ProjectDraft {
  return {
    draftId: draft.id,
    subject: draft.subjectName,
    level: toSharedLevel(draft.level),
    studentInfo: draft.studentInfo,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function toProjectContent(project: any): ProjectContent {
  return {
    projectId: project.id,
    draftId: project.draftId ?? null,
    templateId: project.templateId,
    templateName: project.templateName,
    title: project.title,
    subject: project.subjectName,
    level: toSharedLevel(project.level),
    totalMarks: project.totalMarks,
    status: toSharedStatus(project.status),
    failureReason: project.failureReason ?? null,
    sections: Array.isArray(project.sections) ? project.sections : [],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    readyAt: project.readyAt ? project.readyAt.toISOString() : null,
    pdfReadyAt: project.pdfReadyAt ? project.pdfReadyAt.toISOString() : null,
    pdfFileName: project.pdfFileName ?? null,
  };
}

function buildProjectPdfObjectKey(userId: string, projectId: string): string {
  return `projects/${userId}/${projectId}/project-v1.pdf`;
}

function buildProjectPdfFileName(input: {
  subjectName: string;
  level: ProjectLevel;
}): string {
  return `${slugify(input.subjectName)}-${input.level}.pdf`;
}

function buildProjectPdfFileNameFromTitle(
  title: string,
  level: ProjectLevel,
): string {
  return `${slugify(title)}-${level}.pdf`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

function normalizeProjectSections(value: unknown): ProjectSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sections: ProjectSection[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }

    const item = raw as Record<string, unknown>;
    const key = typeof item.key === 'string' ? item.key.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const body = typeof item.body === 'string' ? item.body.trim() : '';
    if (!key || !title || !body) {
      continue;
    }

    sections.push({ key, title, body });
  }

  return sections;
}

function normalizeEditedSections(
  editedSections: Array<{ key: string; title: string; body: string }>,
  existingSections: ProjectSection[],
): ProjectSection[] {
  const existingByKey = new Map(existingSections.map((section) => [section.key, section]));

  if (editedSections.length !== existingSections.length) {
    throw new BadRequestException('Edited sections must match the existing section count.');
  }

  const normalized: ProjectSection[] = [];
  for (const edited of editedSections) {
    const existing = existingByKey.get(edited.key);
    if (!existing) {
      throw new BadRequestException('Edited sections include an unknown section key.');
    }

    normalized.push({
      key: existing.key,
      title: edited.title.trim(),
      body: edited.body.trim(),
    });
  }

  const expectedOrder = existingSections.map((section) => section.key);
  const editedOrder = normalized.map((section) => section.key);
  if (expectedOrder.join('|') !== editedOrder.join('|')) {
    throw new BadRequestException('Edited sections must keep the same section order.');
  }

  return normalized;
}
