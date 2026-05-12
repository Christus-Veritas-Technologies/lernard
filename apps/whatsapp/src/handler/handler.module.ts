import { Module, forwardRef } from '@nestjs/common';
import { MessageHandlerService } from './message-handler.service';
import { SessionsModule } from '../sessions/sessions.module';
import { LernardApiModule } from '../api/lernard-api.module';
import { IntentModule } from '../intent/intent.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { AuthFlow } from '../flows/auth.flow';
import { LessonFlow } from '../flows/lesson.flow';
import { QuizFlow } from '../flows/quiz.flow';
import { ProjectFlow } from '../flows/project.flow';
import { ChatFlow } from '../flows/chat.flow';
import { PlanLimitFlow } from '../flows/plan-limit.flow';

@Module({
  imports: [
    SessionsModule,
    LernardApiModule,
    IntentModule,
    forwardRef(() => WhatsAppModule),
  ],
  providers: [
    MessageHandlerService,
    PlanLimitFlow,
    AuthFlow,
    LessonFlow,
    QuizFlow,
    ProjectFlow,
    ChatFlow,
  ],
  exports: [MessageHandlerService],
})
export class HandlerModule {}
