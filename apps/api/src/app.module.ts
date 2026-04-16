import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ChatModule } from './modules/chat/chat.module';
import { ProgressModule } from './modules/progress/progress.module';
import { SettingsModule } from './modules/settings/settings.module';
import { GuardianModule } from './modules/guardian/guardian.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OnboardingModule,
    SubjectsModule,
    LessonsModule,
    QuizzesModule,
    ChatModule,
    ProgressModule,
    SettingsModule,
    GuardianModule,
  ],
})
export class AppModule {}
