import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ChatModule } from './modules/chat/chat.module';
import { HomeModule } from './modules/home/home.module';
import { LearnModule } from './modules/learn/learn.module';
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
    QuizzesModule,
    ChatModule,
    HomeModule,
    LearnModule,
    ProgressModule,
    SettingsModule,
    GuardianModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
