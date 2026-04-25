import { Module } from '@nestjs/common';
import { MastraModule } from '../../mastra/mastra.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [MastraModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
