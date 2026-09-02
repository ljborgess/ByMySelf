import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AboutContent } from '../../../../components/about-content';
import { profile } from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');

  return withOpenGraph(
    `${t('title')} — ${profile.name}`,
    profile.bio ?? profile.headline,
  );
}

/**
 * Thin Server Component for `generateMetadata`; actual rendering lives in
 * `AboutContent` (Client Component -- `PinnedSection`'s `onSetup` prop is a
 * function, which cannot cross the Server/Client boundary otherwise). Same
 * split HomeContent/EducationContent/ProjectsList already use.
 */
export default function AboutPage() {
  return <AboutContent />;
}
