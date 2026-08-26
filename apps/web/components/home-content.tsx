import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';
import type { PublicProjectListItem } from '../lib/projects';
import { CoreFocusSection } from './core-focus-section';
import { FeaturedProjects } from './featured-projects';
import { ProfileAvatar } from './profile-avatar';
import { SectionCards } from './section-cards';

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
}: {
  featuredProjects: PublicProjectListItem[];
}) {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* stacks on mobile, side by side from sm -- a 375px viewport cannot
          fit an avatar beside two lines of text without cramping both */}
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
        <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} />

        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {profile.name}
          </h1>
          <p className="text-accent mt-2 font-mono text-base sm:text-lg">
            {profile.headline}
          </p>
        </div>
      </section>

      <CoreFocusSection />

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
