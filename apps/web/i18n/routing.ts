import { defineRouting } from 'next-intl/routing';

/**
 * RNF-I18N1: locale as a URL prefix, PT-BR the default.
 *
 * Only `pt` is listed. The structure exists from day one so every route
 * already lives under a locale prefix -- adding `en` in Fase 3 is a matter of
 * adding it here and translating messages, with no URL restructure and no
 * redirects for a site that is already indexed.
 *
 * `localePrefix: 'always'` keeps `/pt/sobre` canonical instead of letting the
 * default locale also answer on `/sobre`, which would give every page two
 * URLs serving identical content -- duplicate content that would need
 * canonical tags to undo (RNF-SEO1).
 */
export const routing = defineRouting({
  locales: ['pt'],
  defaultLocale: 'pt',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
