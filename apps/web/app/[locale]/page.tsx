import { useTranslations } from 'next-intl';
import { ProfileAvatar } from '../../components/profile-avatar';
import { SectionCards } from '../../components/section-cards';
import { profile } from '../../content/profile';

/**
 * The hub: who this is, in one glance, then a direct route into every
 * section.
 *
 * Plain Tailwind, no Framer Motion -- the animated "produto" hero is Fase 3
 * (docs/roadmap.md), and it is additive over this structure rather than a
 * rewrite of it.
 */
export default function HomePage() {
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
          <p className="mt-2 text-base opacity-70 sm:text-lg">
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
