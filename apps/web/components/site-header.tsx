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
 */
export function SiteHeader() {
  const t = useTranslations('site');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight hover:opacity-70"
          onClick={() => setMenuOpen(false)}
        >
          {t('name')}
        </Link>

        <nav aria-label={tNav('label')} className="hidden sm:block">
          <ul className="flex items-center gap-5 text-sm">
            {NAVIGATION_SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={pathname === section.href ? 'page' : undefined}
                  className="hover:text-accent aria-[current=page]:text-accent font-mono aria-[current=page]:font-semibold"
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
          className="-mr-2 rounded p-2 text-sm sm:hidden"
        >
          {menuOpen ? tNav('closeMenu') : tNav('openMenu')}
        </button>
      </div>

      {/*
        Rendered only when open so the links are not reachable by keyboard
        while visually hidden -- `hidden` alone would leave them tabbable.
      */}
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label={tNav('label')}
          className="border-t border-white/15 sm:hidden"
        >
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-2">
            {NAVIGATION_SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname === section.href ? 'page' : undefined}
                  className="hover:text-accent aria-[current=page]:text-accent block py-2 text-sm font-mono aria-[current=page]:font-semibold"
                >
                  {tNav(section.messageKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
