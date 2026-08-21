import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../lib/site';

/**
 * RF-SEO4. `/admin` doesn't exist in this app yet (the admin panel is a
 * later epic), but the rule is added now rather than when that route
 * lands -- a management interface should never spend even one day
 * indexable before someone remembers to lock it down.
 *
 * Both the bare and the locale-prefixed shape are listed. `localePrefix:
 * 'always'` (i18n/routing.ts) means every route this app serves lives under
 * a locale segment, so a panel added here is at `/pt/admin` -- and robots.txt
 * matches a literal prefix, not path segments, so `Disallow: /admin` alone
 * would not cover it. The wildcard form below (supported by every major
 * crawler) catches any locale, and the bare rule stays for a panel mounted
 * outside the locale tree.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/*/admin'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
