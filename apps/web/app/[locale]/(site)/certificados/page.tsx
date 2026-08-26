import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { CertificatesContent } from '../../../../components/certificates-content';
import { profile } from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('certificates');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB6. Stays a Server Component with `generateMetadata` -- the actual
 * rendering (and the client boundary `HorizontalTimeline` needs) lives in
 * `CertificatesContent`, which is also what certificates-content.test.tsx
 * exercises.
 */
export default function CertificatesPage() {
  const t = useTranslations('certificates');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      <CertificatesContent certificates={profile.certificates} />
    </div>
  );
}
