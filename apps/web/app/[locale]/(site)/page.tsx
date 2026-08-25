import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { OrbGlow } from '../../../components/orb-glow';
import { ProfileAvatar } from '../../../components/profile-avatar';
import { SectionCards } from '../../../components/section-cards';
import { profile } from '../../../content/profile';
import { withOpenGraph } from '../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');

  return withOpenGraph(
    `${profile.name} — ${profile.headline}`,
    t('description'),
  );
}

/**
 * The hub: who this is, in one glance, then a direct route into every
 * section.
 *
 * Plain Tailwind, no Framer Motion. The OrbGlow sits behind the avatar as
 * ambient light, not as a competing focal point -- this hero is still
 * "who this is" first (dark terminal direction, docs/design-orb-ui-reference.md),
 * not a product hero built around the orb itself.
 */
export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      {/* stacks on mobile, side by side from sm -- a 375px viewport cannot
          fit an avatar beside two lines of text without cramping both */}
      <section className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
        <OrbGlow className="absolute -top-16 -left-16 -z-10 opacity-40 blur-3xl" />

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

      <section>
        {/* the cards are the page's navigation, so the heading names them for
            anyone listing landmarks rather than reading top to bottom */}
        <h2 className="sr-only">{t('sectionsHeading')}</h2>
        <SectionCards />
      </section>
    </div>
  );
}
