import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { R2Module } from '../../r2/r2.module';
import { ProjectsController } from './projects.controller';
import { ProjectPdfRendererService } from './project-pdf-renderer.service';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, R2Module],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectPdfRendererService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
