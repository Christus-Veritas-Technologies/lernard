import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { HomeModule } from './modules/home/home.module';
import { ProgressModule } from './modules/progress/progress.module';
import { SettingsModule } from './modules/settings/settings.module';
import { GuardianModule } from './modules/guardian/guardian.module';
import { PrismaModule } from './prisma/prisma.module';
import { MastraModule } from './mastra/mastra.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MastraModule,
    AuthModule,
    OnboardingModule,
    SubjectsModule,
    HomeModule,
    ProgressModule,
    SettingsModule,
    GuardianModule,
    LessonsModule,
    QuizzesModule,
    ChatModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
