import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';

/**
 * RF-SEO4. `/admin` doesn't exist in this app yet (the admin panel is a
 * later epic), but the rule is added now rather than when that route
 * lands -- a management interface should never spend even one day
 * indexable before someone remembers to lock it down.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin',
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
