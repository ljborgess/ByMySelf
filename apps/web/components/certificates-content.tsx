'use client';

import { useTranslations } from 'next-intl';
import type { Certificate } from '../content/profile';
import { formatIssuedAt, sortCertificates } from '../lib/certificates';
import { HorizontalTimeline } from './horizontal-timeline';

/**
 * Split out of page.tsx for the same reason education-content.tsx is --
 * `generateMetadata` stays server-side in page.tsx, and
 * `HorizontalTimeline` needs the client boundary for interaction.
 */
export function CertificatesContent({
  certificates,
}: {
  certificates: Certificate[];
}) {
  const t = useTranslations('certificates');
  const entries = sortCertificates(certificates);

  if (entries.length === 0) {
    return <p className="opacity-70">{t('empty')}</p>;
  }

  return (
    <HorizontalTimeline
      items={entries}
      getKey={(entry) => `${entry.issuer}-${entry.name}`}
      ariaLabel={t('title')}
      renderNode={(entry) => entry.name}
      renderCard={(entry) => {
        const issuedAt = formatIssuedAt(entry.issuedAt);

        return (
          <div>
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
          </div>
        );
      }}
    />
  );
}
