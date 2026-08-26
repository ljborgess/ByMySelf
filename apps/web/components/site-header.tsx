'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '../i18n/navigation';

import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';

/**
 * RNF-USA1: works from 375px. Below `sm` the links collapse behind a toggle
 * rather than wrapping or scrolling horizontally -- five labels do not fit
 * across a 375px viewport, and a header that reflows into two rows pushes
 * page content below the fold on exactly the smallest screens.
 *
 * A client component because the toggle holds state and the current route
 * drives `aria-current`. The layout around it stays a server component.
 *
 * Floating island rather than a full-width bar: detached from the edges,
 * pill-shaped, blurred, so the black background reads around it -- the same
 * pill/circle language the hero CTA and the footer already use. Being
 * `fixed`, it overlaps content, so two things compensate for its height:
 * the layout's top padding (`--header-offset` in globals.css) and
 * PinnedSection, which measures this element to offset where a pin
 * starts. Both derive from the real rendered element, not a copied number.
 *
 * Carries the links alone, centred -- the owner dropped the site name from
 * it. Home stays reachable through the "Início" link, which is the only
 * reason removing the usual name-as-home-link is not a regression.
 */
export function SiteHeader() {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-3 z-40 flex flex-col items-center px-4 sm:top-4 sm:px-6">
      <div className="w-fit max-w-full">
        <div className="bg-background/80 flex items-center justify-center gap-4 rounded-full border border-white/15 px-5 py-2.5 backdrop-blur-md">
          <nav aria-label={tNav('label')} className="hidden sm:block">
            <ul className="flex items-center gap-5 text-sm">
              {NAVIGATION_SECTIONS.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={
                      pathname === section.href ? 'page' : undefined
                    }
                    // py-1.5 is not decoration: the bare line box measured
                    // 18px tall, under WCAG 2.2 SC 2.5.8's 24x24 minimum
                    // (AA, which is the level this project targets).
                    className="hover:text-accent aria-[current=page]:text-accent block py-1.5 font-mono aria-[current=page]:font-semibold"
                  >
                    {tNav(section.messageKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="rounded p-2 text-sm sm:hidden"
          >
            {menuOpen ? tNav('closeMenu') : tNav('openMenu')}
          </button>
        </div>

        {/*
          Rendered only when open so the links are not reachable by keyboard
          while visually hidden -- `hidden` alone would leave them tabbable.
          A separate panel below the pill rather than an expanding pill: a
          rounded-full container growing to fit a stacked list distorts into
          an oval.
        */}
        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label={tNav('label')}
            className="bg-background/95 mt-2 rounded-2xl border border-white/15 backdrop-blur-md sm:hidden"
          >
            <ul className="flex flex-col px-4 py-2">
              {NAVIGATION_SECTIONS.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={
                      pathname === section.href ? 'page' : undefined
                    }
                    className="hover:text-accent aria-[current=page]:text-accent block py-2 font-mono text-sm aria-[current=page]:font-semibold"
                  >
                    {tNav(section.messageKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
