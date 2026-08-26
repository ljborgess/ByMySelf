import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import type { PublicProjectListItem } from '../lib/projects';
import { CoreFocusSection } from './core-focus-section';
import { FeaturedProjects } from './featured-projects';
import { HeroSection } from './hero-section';
import { IntroLoader } from './intro-loader';
import { Marquee } from './marquee';
import { SectionCards } from './section-cards';
import { StatsSection } from './stats-section';

/**
 * The hub: who this is, in one glance, a preview of featured work, then a
 * direct route into every section.
 *
 * Plain component, not the page itself: Next.js does not support
 * unit-testing `async` Server Components, so `page.tsx` (async, fetches
 * projects) stays a thin wrapper and this -- the actual rendering -- is
 * what home-content.test.tsx exercises. Same split ProjectsPage/ProjectsList
 * already uses.
 *
 * Plain Tailwind, no Framer Motion. Ambient lighting comes from the
 * site-wide AuroraBackground (app/[locale]/layout.tsx), not a hero-local
 * element.
 */
export function HomeContent({
  featuredProjects,
  projectCount,
}: {
  featuredProjects: PublicProjectListItem[];
  projectCount: number;
}) {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <IntroLoader />

      <HeroSection />

      <CoreFocusSection />

      <StatsSection projectCount={projectCount} />

      {/* full-bleed: quebra o max-w-5xl do <main> (app/[locale]/(site)/layout.tsx)
          de propósito -- é uma faixa decorativa, não conteúdo de leitura,
          e a referência a estica pela largura inteira do viewport. */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <Marquee items={profile.skills} />
      </div>

      <FeaturedProjects projects={featuredProjects} />

      <section>
        {/* the cards are the page's navigation, so the heading names them for
            anyone listing landmarks rather than reading top to bottom */}
        <h2 className="sr-only">{t('sectionsHeading')}</h2>
        <SectionCards />
      </section>
    </div>
  );
}
