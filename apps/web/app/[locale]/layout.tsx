import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locale as localeParam } from 'next/root-params';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { routing } from '../../i18n/routing';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Luciano Borges — Desenvolvedor Backend',
  description:
    'Portfólio de Luciano Borges, desenvolvedor backend Node.js/NestJS.',
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
        <NextIntlClientProvider>
          <SiteHeader />
          {/* flex-1 so a short page still pushes the footer to the bottom */}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
