import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { profile } from '../../../../content/profile';
import { formatIssuedAt, sortCertificates } from '../../../../lib/certificates';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('certificates');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB6: certificates with a validation link.
 *
 * The link is the point of the page -- a certificate nobody can check is
 * just an assertion. So an entry without one renders as a plain claim rather
 * than as a dead anchor: missing data should read as missing, not as broken.
 */
export default function CertificatesPage() {
  const t = useTranslations('certificates');
  const entries = sortCertificates(profile.certificates);

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
            const issuedAt = formatIssuedAt(entry.issuedAt);

            return (
              <li
                key={`${entry.issuer}-${entry.name}`}
                className="rounded-lg border border-black/10 p-5 dark:border-white/15"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-base font-semibold tracking-tight">
                    {entry.name}
                  </h2>
                  {issuedAt && (
                    <span className="text-sm opacity-70">{issuedAt}</span>
                  )}
                </div>

                <p className="mt-1 text-sm opacity-70">{entry.issuer}</p>

                {entry.credentialUrl && (
                  <a
                    href={entry.credentialUrl}
                    target="_blank"
                    // noreferrer as well as noopener: without it the issuer's
                    // page still learns where the visitor came from
                    rel="noopener noreferrer"
                    className="hover:text-accent mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4"
                  >
                    {t('validate')}
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
