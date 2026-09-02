import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { PinnedRepo } from '@portfolio/shared';
import { ProjectsService } from './projects.service';

/**
 * Unauthenticated and uncached, this is the SSR data path for the Projetos
 * page and the home preview -- so it is throttled on the `public-read`
 * bucket, same as `/health`.
 */
@UseGuards(ThrottlerGuard)
@Controller('projects')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(): Promise<PinnedRepo[]> {
    return this.projectsService.findPinnedRepos();
  }
}
