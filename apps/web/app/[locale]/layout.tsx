import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locale as localeParam } from 'next/root-params';
import { profile } from '../../content/profile';
import { routing } from '../../i18n/routing';
import { getSiteUrl } from '../../lib/site';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Site-wide fallback (RF-SEO1): only reached by a route that defines no
// metadata of its own, since every real page below sets its own title,
// description and openGraph fields.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: `${profile.name} — ${profile.headline}`,
  description: profile.headline,
};

/**
 * Renders `/pt` at build time. Adding `en` to routing.locales is all it takes
 * for its pages to be prerendered too.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * The root layout lives under `[locale]` rather than at `app/layout.tsx`, so
 * `<html lang>` can carry the actual locale. A layout above the locale
 * segment would have to hardcode one language for every page.
 *
 * Carries only the shell: html/body, fonts and the intl provider. The public
 * site's header and footer moved down into `(site)/layout.tsx` when the admin
 * area landed (#23) — the admin panel shares the locale and the providers,
 * but rendering the public nav above a login form would be wrong.
 */
export default async function LocaleLayout({
  children,
}: LayoutProps<'/[locale]'>) {
  const locale = await localeParam();

  // The proxy already rejects unknown locales, but the segment also acts as a
  // catch-all for unmatched paths, so a request can reach here with something
  // that has no messages. Better a 404 than the site rendered under a locale
  // that does not exist.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
