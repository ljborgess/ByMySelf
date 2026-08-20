import { Module } from '@nestjs/common';
import { AdminProjectsController } from './admin-projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [AdminProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  // the public read endpoints land in a later sub-issue and will reuse both
  exports: [ProjectsService],
})
export class ProjectsModule {}
