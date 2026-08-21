import type { Metadata } from 'next';

/**
 * This app's own canonical public URL. Reuses `FRONTEND_URL` -- the same env
 * var the API already reads for CORS (apps/api/src/main.ts) -- rather than
 * introducing a second name for the same URL.
 *
 * Used for `metadataBase` and every absolute URL the SEO metadata (sitemap,
 * robots, Open Graph) needs to emit. A function rather than a module-level
 * constant, same as `API_URL` in lib/projects.ts, so it reads `process.env`
 * at call time instead of freezing whatever it was during module init.
 */
export function getSiteUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3101';
}

/**
 * RF-SEO2: the Open Graph image for every page that has no natural one of
 * its own (every page except the project detail page, which uses the
 * project's own coverImageUrl when set). A plain `Metadata.openGraph` object
 * on a page fully replaces any `openGraph` inherited from a parent segment
 * rather than merging into it, so this is imported into each page's own
 * `generateMetadata` instead of being declared once in the layout.
 */
export const defaultOgImage = {
  url: '/og-default.png',
  width: 1200,
  height: 630,
};

type OgImage = string | { url: string; width?: number; height?: number };

/**
 * Every page's `generateMetadata` needs the same `title`/`description` set
 * both at the top level and mirrored into `openGraph` (Next does not do
 * that mirroring itself -- an `openGraph` object on a page fully replaces
 * whatever a parent segment would have contributed, it does not merge with
 * it). Centralizing that shape here means the five pages that only differ by
 * title/description/image share one definition of what "this page's SEO
 * metadata" looks like, instead of each repeating the same three lines.
 */
export function withOpenGraph(
  title: string,
  description: string,
  image: OgImage = defaultOgImage,
): { title: string; description: string; openGraph: Metadata['openGraph'] } {
  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
  };
}
