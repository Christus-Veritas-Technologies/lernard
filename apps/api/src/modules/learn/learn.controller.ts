import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { LearnContent, PagePayload } from '@lernard/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { LearnService } from './learn.service';

@Controller('learn')
export class LearnController {
  constructor(private readonly learnService: LearnService) {}

  @ProtectedRoute()
  @Get('payload')
  async getPayload(@CurrentUser() user: User): Promise<PagePayload<LearnContent>> {
    return this.learnService.getPayload(user.id);
  }
}