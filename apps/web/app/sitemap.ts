import type { MetadataRoute } from 'next';
import { getPublishedProjects } from '../lib/projects';
import { getSiteUrl } from '../lib/site';

/**
 * RF-SEO3. Every static public route, in the one locale routing.ts currently
 * lists ('pt') -- adding 'en' here is Fase 3, same as the routing config
 * itself (see i18n/routing.ts).
 */
const staticRoutes = ['', '/sobre', '/formacao', '/certificados', '/projetos'];

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
    lastModified: new Date(),
  }));

  let projects: { slug: string }[] = [];
  try {
    projects = await getPublishedProjects('pt');
  } catch (error) {
    console.error('Failed to load /projects for sitemap.xml:', error);
  }

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${siteUrl}/pt/projetos/${project.slug}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...projectEntries];
}
