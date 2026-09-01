import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CertificatesContent } from '../../../../components/certificates-content';
import { profile } from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('certificates');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB6. Server Component for generateMetadata; client boundary lives in
 * CertificatesContent. The component owns its heading (cert name as h1)
 * and the "CERTIFICADOS" label, so no outer h1 here.
 */
export default function CertificatesPage() {
  return <CertificatesContent certificates={profile.certificates} />;
}
