import { Module } from '@nestjs/common';
import { LernardApiService } from './lernard-api.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  providers: [LernardApiService],
  exports: [LernardApiService],
})
export class LernardApiModule {}
