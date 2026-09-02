import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Redirects `/` to the default locale and rejects unknown locale segments.
 *
 * Named `proxy.ts` exporting `proxy`, not `middleware.ts` exporting
 * `middleware`: Next.js 16 renamed the file convention (the behaviour is
 * unchanged). next-intl's own docs still show the old name, so following them
 * literally produces a file Next never loads -- and the failure is silent,
 * since a site with no locale routing still builds and serves `/pt` directly.
 */
export const proxy = createMiddleware(routing);

export const config = {
  // Skips API routes, Next internals and anything with a file extension, so
  // static assets are not put through locale negotiation.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
