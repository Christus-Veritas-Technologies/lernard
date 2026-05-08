import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  async getAll() {
    return this.subjectsService.getAll();
  }

  @ProtectedRoute()
  @Get('mine')
  async getMine(@CurrentUser() user: User) {
    return this.subjectsService.getMine(user.id);
  }

  @ProtectedRoute()
  @Post('mine')
  async addMine(
    @CurrentUser() user: User,
    @Body('subjects') subjects: string[],
  ) {
    return this.subjectsService.addMine(user.id, subjects);
  }

  @ProtectedRoute()
  @Delete('mine/:subjectId')
  async removeMine(
    @CurrentUser() user: User,
    @Param('subjectId') subjectId: string,
  ) {
    return this.subjectsService.removeMine(user.id, subjectId);
  }

  @ProtectedRoute()
  @Patch('mine/reorder')
  async reorder(@CurrentUser() user: User, @Body('order') order: string[]) {
    return this.subjectsService.reorder(user.id, order);
  }
}
