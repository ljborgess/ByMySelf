import { Module } from '@nestjs/common';
import { AdminProjectsController } from './admin-projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { PublicProjectsController } from './public-projects.controller';

@Module({
  controllers: [AdminProjectsController, PublicProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService],
})
export class ProjectsModule {}
