import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  PagePayload,
  ProjectDraft,
  ProjectsContent,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import {
  CreateProjectDraftDto,
  EditProjectPdfDto,
  GenerateProjectDto,
  ProjectTemplatesQueryDto,
  UpdateProjectDraftDto,
} from './dto/projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ProtectedRoute()
  @Get('payload')
  async getPayload(@CurrentUser() user: User): Promise<PagePayload<ProjectsContent>> {
    return this.projectsService.getPayload(user);
  }

  @ProtectedRoute()
  @Get('templates')
  async listTemplates(@Query() query: ProjectTemplatesQueryDto) {
    return this.projectsService.listTemplates(query.level);
  }

  @ProtectedRoute()
  @Post('drafts')
  async createDraft(
    @CurrentUser() user: User,
    @Body() dto: CreateProjectDraftDto,
  ): Promise<ProjectDraft> {
    return this.projectsService.createDraft(user, dto);
  }

  @ProtectedRoute()
  @Patch('drafts/:draftId')
  async updateDraft(
    @CurrentUser() user: User,
    @Param('draftId') draftId: string,
    @Body() dto: UpdateProjectDraftDto,
  ): Promise<ProjectDraft> {
    return this.projectsService.updateDraft(user, draftId, dto);
  }

  @ProtectedRoute()
  @Get('drafts/:draftId')
  async getDraft(@CurrentUser() user: User, @Param('draftId') draftId: string) {
    return this.projectsService.getDraft(user, draftId);
  }

  @ProtectedRoute({ planLimit: 'projects' })
  @Post('generate')
  async generate(@CurrentUser() user: User, @Body() dto: GenerateProjectDto) {
    return this.projectsService.generateFromDraft(user, dto);
  }

  @ProtectedRoute()
  @Get(':projectId')
  async getProject(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.getProject(user, projectId);
  }

  @ProtectedRoute()
  @Get(':projectId/status')
  async getStatus(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.getProjectStatus(user, projectId);
  }

  @ProtectedRoute()
  @Get(':projectId/download')
  async download(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projectsService.getProjectDownload(user, projectId);
  }

  @ProtectedRoute()
  @Patch(':projectId/edit-pdf')
  async editPdf(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: EditProjectPdfDto,
  ) {
    return this.projectsService.editProjectPdf(user, projectId, dto);
  }
}
