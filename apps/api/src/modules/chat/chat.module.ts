import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { R2Module } from '../../r2/r2.module';
import { LessonsModule } from '../lessons/lessons.module';
import { QuizzesModule } from '../quizzes/quizzes.module';

@Module({
  imports: [R2Module, LessonsModule, QuizzesModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
