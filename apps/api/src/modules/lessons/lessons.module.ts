import { Module } from '@nestjs/common';
import { R2Module } from '../../r2/r2.module';
import { LessonStreamingService } from '../../common/streaming/lesson-streaming.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [R2Module, NotificationsModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonStreamingService],
  exports: [LessonsService],
})
export class LessonsModule {}
