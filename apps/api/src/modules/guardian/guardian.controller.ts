import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { GuardianService } from './guardian.service';
import {
  InviteChildDto,
  AcceptInviteDto,
  UpdateChildCompanionControlsDto,
  UpdateChildSettingsDto,
} from './dto/guardian.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';
import type {
  ChildCompanionContent,
  ChildProfileContent,
  GuardianDashboardContent,
  PagePayload,
} from '@lernard/shared-types';
import { Role } from '@lernard/shared-types';

@Controller('guardian')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Get('children/payload')
  async getChildrenPayload(
    @CurrentUser() user: User,
  ): Promise<PagePayload<GuardianDashboardContent>> {
    return this.guardianService.getChildrenPayload(user.id);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Get('children')
  async getChildren(@CurrentUser() user: User) {
    return this.guardianService.getChildren(user.id);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Post('children/invite')
  async inviteChild(@CurrentUser() user: User, @Body() dto: InviteChildDto) {
    return this.guardianService.inviteChild(user.id, dto);
  }

  @ProtectedRoute()
  @Post('children/accept-invite')
  async acceptInvite(@CurrentUser() user: User, @Body() dto: AcceptInviteDto) {
    return this.guardianService.acceptInvite(user.id, dto.code);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Get('children/pending')
  async getPending(@CurrentUser() user: User) {
    return this.guardianService.getPending(user.id);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Delete('children/invite/:token')
  async cancelInvite(@CurrentUser() user: User, @Param('token') token: string) {
    return this.guardianService.cancelInvite(user.id, token);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN] })
  @Patch('children/invite/:token/resend')
  async resendInvite(@CurrentUser() user: User, @Param('token') token: string) {
    return this.guardianService.resendInvite(user.id, token);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Get('children/:childId/payload')
  async getChildPayload(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
  ): Promise<PagePayload<ChildProfileContent>> {
    return this.guardianService.getChildPayload(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Get('children/:childId')
  async getChild(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.guardianService.getChild(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Patch('children/:childId')
  async updateChildSettings(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Body() dto: UpdateChildSettingsDto,
  ) {
    return this.guardianService.updateChildSettings(user.id, childId, dto);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Delete('children/:childId')
  async removeChild(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.guardianService.removeChild(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Get('children/:childId/progress')
  async getChildProgress(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.guardianService.getChildProgress(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Get('children/:childId/subjects')
  async getChildSubjects(@CurrentUser() user: User, @Param('childId') childId: string) {
    return this.guardianService.getChildSubjects(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Get('children/:childId/companion-controls/payload')
  async getChildCompanionPayload(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
  ): Promise<PagePayload<ChildCompanionContent>> {
    return this.guardianService.getChildCompanionPayload(user.id, childId);
  }

  @ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
  @Patch('children/:childId/companion-controls')
  async updateChildCompanionControls(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Body() dto: UpdateChildCompanionControlsDto,
  ) {
    return this.guardianService.updateChildCompanionControls(
      user.id,
      childId,
      dto,
    );
  }
}
