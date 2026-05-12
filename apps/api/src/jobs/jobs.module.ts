import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { SetupReminderJob } from './setup-reminder.job';
import { PlanExpiryJob } from './plan-expiry.job';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule],
  providers: [SetupReminderJob, PlanExpiryJob],
})
export class JobsModule {}
