import { Module } from '@nestjs/common';
import { MastraModule } from '../../mastra/mastra.module';
import { LessonsModule } from '../lessons/lessons.module';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MastraModule, LessonsModule, QuizzesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
