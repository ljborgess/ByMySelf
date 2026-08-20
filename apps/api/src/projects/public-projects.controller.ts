import { Controller, Get, Param, Query } from '@nestjs/common';
import type { PublicProject, PublicProjectSummary } from '@portfolio/shared';
import { LocaleQueryDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

/**
 * Deliberately outside /admin, so the global AuthGuard never looks at these
 * -- the public site reads them with no session at all (user story 4).
 *
 * Both are GET, so the CSRF guard also passes them through untouched.
 *
 * No pagination, per the route contract: a personal portfolio's project
 * count does not justify it.
 */
@Controller('projects')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** RF-PUB1: live and not archived, in manual order, `featured` included. */
  @Get()
  async findAll(
    @Query() { locale }: LocaleQueryDto,
  ): Promise<PublicProjectSummary[]> {
    return this.projectsService.findPublished(locale);
  }

  /**
   * RF-PUB2. Looked up by slug rather than id because the slug is the public
   * URL and is shared across locales, so a detail link never changes when a
   * translation lands.
   */
  @Get(':slug')
  async findOne(
    @Param('slug') slug: string,
    @Query() { locale }: LocaleQueryDto,
  ): Promise<PublicProject> {
    return this.projectsService.findPublishedBySlug(slug, locale);
  }
}
