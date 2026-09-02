'use client';

import { useTranslations } from 'next-intl';
import {
  profile,
  type LanguageLevel,
  type SkillLevel,
} from '../content/profile';
import { safeHref, safeMailto } from '../lib/urls';
import { CvDownloadButton } from './cv-download-button';
import { PinnedSection } from './pinned-section';
import { ProfileAvatar } from './profile-avatar';
import { SkillBar } from './skill-bar';

const LANG_LEVEL_MAP: Record<LanguageLevel, SkillLevel> = {
  nativo: 'EXPERT',
  fluente: 'ADV',
  avançado: 'ADV',
  intermediário: 'INT',
  básico: 'JR',
};

/**
 * #150: rewrite off `HudPanel` (a one-off "sci-fi HUD" component that only
 * ever had this page as a consumer, added 2026-09-01 without an issue and
 * without updating docs/DESIGN.md) onto the site's actual shared reveal
 * device -- `PinnedSection`, same one CoreFocusSection/StatsSection use on
 * the home page. See docs/design-clone-syahril.md's "Sobre" row and #150
 * for the full rationale.
 *
 * 'use client': `onSetup` below is a function passed to `PinnedSection` (a
 * Client Component) -- same Server/Client boundary rule CoreFocusSection
 * and StatsSection already follow. `page.tsx` stays the thin Server
 * Component (generateMetadata), this is what actually renders.
 */
export function AboutContent() {
  const t = useTranslations('about');

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      {profile.photoUrl && (
        // Foto duotone (docs/design-clone-syahril.md's "Foto duotone"
        // section) -- full-bleed like the marquee (home-content.tsx).
        // aria-hidden: the ProfileAvatar right below already carries the
        // accessible photo (alt={name}), so this is a purely decorative,
        // enlarged restatement of it, not new information.
        <div
          aria-hidden="true"
          className="relative left-1/2 right-1/2 -mx-[50vw] w-screen"
        >
          {/* plain <img>, not next/image -- same reasoning as ProfileAvatar:
              photoUrl is an arbitrary external URL the owner pastes in */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.photoUrl}
            alt=""
            loading="lazy"
            className="aspect-[21/9] w-full grayscale contrast-125 object-cover sm:aspect-[3/1]"
          />
        </div>
      )}

      <PinnedSection
        className="py-10 sm:py-14"
        scrollDistance="+=50%"
        onSetup={(timeline, container) => {
          const query = (selector: string) =>
            container.querySelectorAll(selector);

          // Same shape as CoreFocusSection's reveal: transforms only, never
          // opacity (#135) -- a scrubbed .from() applies its starting
          // values at page load, before ScrollTrigger's pin engages, so an
          // opacity-0 start would sit visibly empty until then.
          timeline
            .from(query('[data-reveal="identity"]'), { y: 24 })
            .from(
              query('[data-reveal="rule"]'),
              { scaleX: 0, transformOrigin: 'left center' },
              '<0.15',
            )
            .from(query('[data-reveal="stack"]'), { x: 16 }, '<0.15');
        }}
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-5">
          <div
            data-reveal="identity"
            className="flex flex-col items-center gap-5 text-center sm:col-span-2"
          >
            <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} />

            <div className="flex flex-col gap-2">
              <p className="font-display text-2xl font-black tracking-tight">
                {profile.name}
              </p>
              <p className="font-mono text-xs tracking-widest text-foreground/60 uppercase">
                {profile.headline}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-highlight-green motion-safe:animate-pulse"
                />
                <span className="font-mono text-[10px] tracking-widest text-highlight-green uppercase">
                  online
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {safeHref(profile.links.github) && (
                <a
                  href={safeHref(profile.links.github)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase transition-colors hover:text-accent"
                >
                  GitHub
                </a>
              )}
              {safeHref(profile.links.linkedin) && (
                <>
                  {safeHref(profile.links.github) && (
                    <span aria-hidden="true" className="text-foreground/20">
                      /
                    </span>
                  )}
                  <a
                    href={safeHref(profile.links.linkedin)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase transition-colors hover:text-accent"
                  >
                    LinkedIn
                  </a>
                </>
              )}
              {safeMailto(profile.links.email) && (
                <>
                  {(safeHref(profile.links.github) ||
                    safeHref(profile.links.linkedin)) && (
                    <span aria-hidden="true" className="text-foreground/20">
                      /
                    </span>
                  )}
                  <a
                    href={safeMailto(profile.links.email)!}
                    className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase transition-colors hover:text-accent"
                  >
                    Email
                  </a>
                </>
              )}
            </div>

            {profile.cvUrl && <CvDownloadButton />}
          </div>

          <hr data-reveal="rule" className="border-white/15 sm:hidden" />

          {profile.skills.length > 0 && (
            <div
              data-reveal="stack"
              className="flex flex-col gap-4 sm:col-span-3"
            >
              <h2 className="sr-only">{t('skillsHeading')}</h2>
              {profile.skills.map((skill) => (
                <SkillBar
                  key={skill.name}
                  name={skill.name}
                  level={skill.level}
                />
              ))}
            </div>
          )}
        </div>
      </PinnedSection>

      {profile.bio && (
        <PinnedSection
          className="py-10 sm:py-14"
          scrollDistance="+=50%"
          onSetup={(timeline, container) => {
            timeline.from(container.querySelectorAll('[data-reveal="bio"]'), {
              y: 20,
              stagger: 0.1,
            });
          }}
        >
          <h2
            data-reveal="bio"
            className="font-mono text-xs tracking-[0.2em] text-highlight-red uppercase"
          >
            {t('bioHeading')}
          </h2>
          <p
            data-reveal="bio"
            className="mt-4 leading-relaxed whitespace-pre-line opacity-80"
          >
            {profile.bio}
          </p>
        </PinnedSection>
      )}

      {profile.languages.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="sr-only">{t('languagesHeading')}</h2>
          {profile.languages.map((lang) => (
            <SkillBar
              key={lang.language}
              name={lang.language}
              level={LANG_LEVEL_MAP[lang.level]}
              displayLabel={lang.level}
            />
          ))}
        </section>
      )}
    </div>
  );
}
