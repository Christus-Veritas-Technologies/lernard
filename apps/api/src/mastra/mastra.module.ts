import { Global, Module } from '@nestjs/common';
import { MastraService } from './mastra.service';
import { StudentContextBuilder } from './student-context.builder';

@Global()
@Module({
  providers: [MastraService, StudentContextBuilder],
  exports: [MastraService, StudentContextBuilder],
})
export class MastraModule {}
