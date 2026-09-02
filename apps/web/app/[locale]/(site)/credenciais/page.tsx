import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { CertificatesContent } from '../../../../components/certificates-content';
import { EducationContent } from '../../../../components/education-content';
import { profile } from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('credentials');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * #154: formação + certificados merged into one page, off `/formacao` and
 * `/certificados` (both now 301 to here, see next.config.ts) -- neither had
 * enough content to justify a standalone route (grilling 2026-09-02:
 * education has a single entry, 4 of 6 certificates are still placeholders).
 * Two stacked sections, each component reused unchanged; the certificates
 * slideshow's own h1s were downgraded to h2 (certificates-content.tsx) so
 * this page keeps exactly one h1.
 */
export default function CredentialsPage() {
  const t = useTranslations('credentials');
  const tEducation = useTranslations('education');
  const tCertificates = useTranslations('certificates');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-highlight-red uppercase">
          {tEducation('title')}
        </h2>
        <EducationContent education={profile.education} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="sr-only">{tCertificates('title')}</h2>
        <CertificatesContent certificates={profile.certificates} />
      </section>
    </div>
  );
}
