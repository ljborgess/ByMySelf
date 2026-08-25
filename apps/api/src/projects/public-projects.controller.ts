import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { PublicProject, PublicProjectSummary } from '@portfolio/shared';
import {
  ADMIN_THROTTLE_NAME,
  AUTH_IP_THROTTLE_NAME,
} from '../auth/auth.constants';
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
 *
 * Throttled on the `public-read` bucket. Unauthenticated and uncached, these
 * two are the SSR data path for every public page -- and sitemap.xml hits
 * the listing on every crawler fetch, so an unbounded loop here is a
 * straight line into Postgres. The strict `auth-ip` bucket is skipped: at 10
 * requests per 15 minutes it would break the site for real visitors.
 */
@SkipThrottle({
  [AUTH_IP_THROTTLE_NAME]: true,
  [ADMIN_THROTTLE_NAME]: true,
})
@UseGuards(ThrottlerGuard)
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
