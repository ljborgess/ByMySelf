import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { EducationContent } from '../../../../components/education-content';
import { profile } from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('education');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB5. Stays a Server Component with `generateMetadata` -- the actual
 * rendering (and the client boundary `HorizontalTimeline` needs) lives in
 * `EducationContent`, which is also what education-content.test.tsx
 * exercises.
 */
export default function EducationPage() {
  const t = useTranslations('education');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      <EducationContent education={profile.education} />
    </div>
  );
}
