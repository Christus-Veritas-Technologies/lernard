import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { HomeContent, PagePayload } from '@lernard/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @ProtectedRoute()
  @Get('payload')
  async getPayload(@CurrentUser() user: User): Promise<PagePayload<HomeContent>> {
    return this.homeService.getPayload(user.id);
  }
}