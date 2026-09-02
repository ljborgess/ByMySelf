import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';

/**
 * RF-SEO3. Every public route, in the one locale routing.ts currently lists
 * ('pt') -- adding 'en' here is Fase 3, same as the routing config itself
 * (see i18n/routing.ts).
 *
 * No per-project URLs (docs/decisao-projetos-github-pins.md): /projetos has
 * no detail page anymore, each pin links straight out to its GitHub repo,
 * which is not this site's URL to list.
 */
const staticRoutes = ['', '/sobre', '/credenciais', '/projetos'];

/**
 * When this build was made. Every route here is either static content
 * compiled into the bundle or a listing whose own freshness the visitor
 * sees on the page (RF-SEO3) -- so the build is genuinely the last time the
 * sitemap's own shape changed.
 */
const buildTime = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return staticRoutes.map((route) => ({
    url: `${siteUrl}/pt${route}`,
    lastModified: buildTime,
  }));
}
