import { useTranslations } from 'next-intl';
import type { PublicProjectListItem } from '../lib/projects';
import { CoreFocusSection } from './core-focus-section';
import { FeaturedProjects } from './featured-projects';
import { HeroSection } from './hero-section';
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
      <HeroSection />

      <CoreFocusSection />

      <StatsSection projectCount={projectCount} />

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
