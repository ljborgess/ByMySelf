import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';

/**
 * The hub: one card per section, derived from the same list the header reads,
 * minus home (linking the page you are already on is noise). A section added
 * to that list therefore appears here without anyone remembering to add it.
 */
const CARD_SECTIONS = NAVIGATION_SECTIONS.filter(
  (section) => section.href !== '/',
);

export function SectionCards() {
  const tNav = useTranslations('nav');
  const t = useTranslations('home.cards');

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {CARD_SECTIONS.map((section) => (
        <li key={section.href}>
          <Link
            href={section.href}
            // the whole card is the target, not just the title -- a card that
            // looks clickable but only responds on its heading is a trap
            className="group flex h-full flex-col rounded-lg border border-black/10 p-5 transition-colors hover:border-black/30 focus-visible:border-black/30 dark:border-white/15 dark:hover:border-white/40 dark:focus-visible:border-white/40"
          >
            <span className="text-base font-semibold tracking-tight">
              {tNav(section.messageKey)}
            </span>
            <span className="mt-1 text-sm opacity-70">
              {t(section.messageKey)}
            </span>
            <span
              aria-hidden="true"
              className="mt-4 text-sm opacity-50 transition-opacity group-hover:opacity-100"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
