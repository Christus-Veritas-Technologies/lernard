import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  AccountTypeDto,
  ProfileSetupDto,
  FirstLookSubmitDto,
} from './dto/onboarding.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import type { User } from '@prisma/client';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @ProtectedRoute()
  @Post('account-type')
  async accountType(@CurrentUser() user: User, @Body() dto: AccountTypeDto) {
    return this.onboardingService.setAccountType(user.id, dto.accountType);
  }

  @ProtectedRoute()
  @Post('profile')
  async profile(@CurrentUser() user: User, @Body() dto: ProfileSetupDto) {
    return this.onboardingService.setupProfile(user.id, dto);
  }

  @ProtectedRoute()
  @Post('subjects')
  async subjects(
    @CurrentUser() user: User,
    @Body('subjects') subjects: string[],
  ) {
    return this.onboardingService.setSubjects(user.id, subjects);
  }

  @ProtectedRoute()
  @Post('first-look/start')
  async startFirstLook(@CurrentUser() user: User) {
    return this.onboardingService.startFirstLook(user.id);
  }

  @ProtectedRoute()
  @Post('first-look/submit')
  async submitFirstLook(
    @CurrentUser() user: User,
    @Body() dto: FirstLookSubmitDto,
  ) {
    return this.onboardingService.submitFirstLook(user.id, dto);
  }

  @ProtectedRoute()
  @Post('first-look/skip')
  async skipFirstLook(@CurrentUser() user: User) {
    return this.onboardingService.skipFirstLook(user.id);
  }
}
