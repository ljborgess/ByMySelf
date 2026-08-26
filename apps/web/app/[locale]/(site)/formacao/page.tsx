import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { profile } from '../../../../content/profile';
import { formatPeriod, sortEducation } from '../../../../lib/education';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('education');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB5: academic background with the technologies tied to each entry.
 *
 * Unlike Sobre, the list *is* the page, so an empty one gets a stated
 * message rather than a bare heading -- a visitor should learn there is
 * nothing here yet, not wonder whether the page failed to load.
 */
export default function EducationPage() {
  const t = useTranslations('education');
  const entries = sortEducation(profile.education);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      {entries.length === 0 ? (
        <p className="opacity-70">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => {
            const period = formatPeriod(entry, t('ongoing'));

            return (
              <li
                key={`${entry.course}-${entry.institution ?? ''}`}
                className="rounded-lg border border-white/15 p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-base font-semibold tracking-tight">
                    {entry.course}
                  </h2>

                  {/* the period when a start date is known; otherwise just
                      the ongoing badge, so "em andamento" is never lost for
                      want of a date */}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
