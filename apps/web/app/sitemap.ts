import type { MetadataRoute } from 'next';
import {
  getPublishedProjects,
  type PublicProjectListItem,
} from '../lib/projects';
import { getSiteUrl } from '../lib/site';

/**
 * RF-SEO3. Every static public route, in the one locale routing.ts currently
 * lists ('pt') -- adding 'en' here is Fase 3, same as the routing config
 * itself (see i18n/routing.ts).
 */
const staticRoutes = ['', '/sobre', '/credenciais', '/projetos'];

/**
 * When this build was made. The static pages are content compiled into the
 * bundle (profile.ts and the messages file), so the build is genuinely the
 * last time they changed.
 *
 * Deliberately not `new Date()` per request: that would tell crawlers the
 * whole site changed seconds ago on every fetch, and a `lastmod` that always
 * says "just now" is one search engines learn to discount entirely -- which
 * costs exactly the RF-SEO3 signal this file exists to send.
 */
const buildTime = new Date();

/**
 * Crawlers fetch this on a schedule nobody controls, and it was previously
 * uncached end to end -- every hit reached the API and then the database.
 * An hour of staleness is invisible for a sitemap (a project published now
 * is discoverable within the hour, and the listing page links it
 * immediately either way) and it collapses that traffic to one query.
 */
export const revalidate = 3600;

/**
 * Rendered fresh on every request rather than statically: a project slug
 * published or unpublished after build time would otherwise be missing from
 * (or dangling in) a stale sitemap. Same reasoning as the Projetos listing
 * page (`getPublishedProjects`'s `no-store` fetch).
 *
 * The fetch is caught rather than left to fail the whole route: a down API
 * should still produce a sitemap with the static routes, not a 500 that
 * takes indexing of the entire site down with it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}/pt${route}`,
    lastModified: buildTime,
  }));

  let projects: PublicProjectListItem[] = [];
  try {
    projects = await getPublishedProjects('pt', { revalidate });
  } catch (error) {
    console.error('Failed to load /projects for sitemap.xml:', error);
  }

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteUrl}/pt/projetos/${project.slug}`,
    // the project's own last edit, not the request time -- an API that
    // predates this field, or hands back something unparseable, falls back
    // to the build rather than emitting an invalid `lastmod`
    lastModified: parseUpdatedAt(project.updatedAt),
  }));

  return [...staticEntries, ...projectEntries];
}

function parseUpdatedAt(updatedAt: string | undefined): Date {
  if (!updatedAt) {
    return buildTime;
  }

  const parsed = new Date(updatedAt);
  return Number.isNaN(parsed.getTime()) ? buildTime : parsed;
}
