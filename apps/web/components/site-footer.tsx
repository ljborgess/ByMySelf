'use client';

import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import { CvDownloadButton } from './cv-download-button';
import { Marquee } from './marquee';

interface FooterLink {
  messageKey: string;
  href: string;
  /** mailto: opens a mail client, so a new browser tab makes no sense. */
  external: boolean;
}

/**
 * Built per render rather than once at module scope. Module-scope state
 * derived from configuration looks harmless but freezes at import time,
 * which makes it invisible to anything that changes the profile afterwards
 * -- tests included.
 *
 * Entries with no address are dropped, so an unset link simply does not
 * render instead of becoming a dead one.
 */
function footerLinks(): FooterLink[] {
  const { github, linkedin, email } = profile.links;

  return [
    { messageKey: 'github', href: github, external: true },
    { messageKey: 'linkedin', href: linkedin, external: true },
    {
      messageKey: 'email',
      href: email ? `mailto:${email}` : null,
      external: false,
    },
  ].flatMap((link) => (link.href ? [{ ...link, href: link.href }] : []));
}

function scrollToTop() {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

/**
 * Footer/CTA final (#134, docs/design-clone-syahril.md's "Footer/CTA final"
 * section): a CTA banner (mixed-weight headline, "Hire Me" + CV pill
 * buttons, diagonal marquee stripes behind) above the original minimal bar
 * (copyright + profile links), which now also gets a back-to-top button.
 *
 * No "MORE" pill (present in the reference for extra links): there is
 * nothing beyond github/linkedin/email already in the bar to put in it --
 * an empty expandable menu would be worse than no menu.
 *
 * 'use client': the back-to-top button needs an onClick handler and a
 * prefers-reduced-motion check, both client-only. Everything else here
 * (translations, the year) still works fine rendered client-side.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const links = footerLinks();

  return (
    <footer className="mt-auto border-t border-white/15">
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
        {/* Marquee already renders aria-hidden -- purely decorative texture
            behind the CTA text, not content. Two stripes crossing at
            opposite angles is what "diagonal marquee stripes" (plural, per
            the reference) means here. */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]">
          <Marquee
            items={profile.skills}
            rotateDeg={-6}
            durationSeconds={38}
            className="absolute top-6 left-[-15%] w-[130%]"
          />
          <Marquee
            items={profile.skills}
            rotateDeg={6}
            reverse
            durationSeconds={42}
            className="absolute bottom-6 left-[-15%] w-[130%]"
          />
        </div>

        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6">
          <h2 className="font-display text-4xl leading-tight font-black tracking-tight sm:text-6xl">
            {t('cta.headlineStrong')}{' '}
            <span className="opacity-40">{t('cta.headlineDim')}</span>
          </h2>

          <p className="max-w-xl opacity-70">{t('cta.support')}</p>

          <div className="flex flex-wrap items-center gap-3">
            {profile.links.email && (
              <a
                href={`mailto:${profile.links.email}`}
                // mesmo par pill preenchido + círculo do hero (#134 reaproveita
                // o estilo, ver hero-section.tsx)
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                <span aria-hidden="true">✉</span>
                {t('cta.hireMe')}
              </a>
            )}

            <CvDownloadButton variant="outline" />
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-3 border-t border-white/15 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="opacity-70">
          © {new Date().getFullYear()} {profile.name}. {t('rights')}
        </p>

        <div className="flex items-center gap-4">
          {links.length > 0 && (
            <ul className="flex items-center gap-4">
              {links.map((link) => (
                <li key={link.messageKey}>
                  <a
                    href={link.href}
                    {...(link.external
                      ? {
                          target: '_blank',
                          // noreferrer alongside noopener: without it the
                          // target page still learns where the visitor came from
                          rel: 'noopener noreferrer',
                        }
                      : {})}
                    className="hover:text-accent"
                  >
                    {t(`links.${link.messageKey}`)}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={scrollToTop}
            aria-label={t('backToTop')}
            className="border-highlight-red hover:bg-highlight-red flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors"
          >
            <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
