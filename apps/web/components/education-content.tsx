'use client';

import { useTranslations } from 'next-intl';
import type { Education } from '../content/profile';
import { formatPeriod, sortEducation } from '../lib/education';
import { HorizontalTimeline } from './horizontal-timeline';

/**
 * Split out of page.tsx for the same reason ProjectsList/HomeContent are --
 * plus one more here: `page.tsx` keeps `generateMetadata` (server-only
 * export, cannot coexist with `'use client'`), and `HorizontalTimeline`
 * needs interaction (click a node, scroll the track), so this piece has to
 * be the client boundary.
 */
export function EducationContent({ education }: { education: Education[] }) {
  const t = useTranslations('education');
  const entries = sortEducation(education);

  if (entries.length === 0) {
    return <p className="opacity-70">{t('empty')}</p>;
  }

  return (
    <HorizontalTimeline
      items={entries}
      getKey={(entry) => `${entry.course}-${entry.institution ?? ''}`}
      ariaLabel={t('title')}
      renderNode={(entry) => entry.course}
      renderCard={(entry) => {
        const period = formatPeriod(entry, t('ongoing'));

        return (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-base font-semibold tracking-tight">
                {entry.course}
              </h2>

              {/* the period when a start date is known; otherwise just the
                  ongoing badge, so "em andamento" is never lost for want of
                  a date */}
              {period ? (
                <span className="text-sm opacity-70">{period}</span>
              ) : (
                entry.endDate === null && (
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs">
                    {t('ongoing')}
                  </span>
                )
              )}
            </div>

            {entry.institution && (
              <p className="mt-1 text-sm opacity-70">{entry.institution}</p>
            )}

            {entry.technologies && entry.technologies.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {entry.technologies.map((technology) => (
                  <li
                    key={technology}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs"
                  >
                    {technology}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    />
  );
}
