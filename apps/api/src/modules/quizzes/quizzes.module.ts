import { Module } from '@nestjs/common';
import { R2Module } from '../../r2/r2.module';
import { QuizStreamingService } from '../../common/streaming/quiz-streaming.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

@Module({
  imports: [R2Module, NotificationsModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizStreamingService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
