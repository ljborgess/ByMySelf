import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { CvDownloadButton } from '../../../../components/cv-download-button';
import { HudPanel } from '../../../../components/hud-panel';
import { ProfileAvatar } from '../../../../components/profile-avatar';
import { SkillBar } from '../../../../components/skill-bar';
import {
  profile,
  type LanguageLevel,
  type SkillLevel,
} from '../../../../content/profile';
import { withOpenGraph } from '../../../../lib/site';
import { safeHref, safeMailto } from '../../../../lib/urls';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');

  return withOpenGraph(
    `${t('title')} — ${profile.name}`,
    profile.bio ?? profile.headline,
  );
}

const LANG_LEVEL_MAP: Record<LanguageLevel, SkillLevel> = {
  nativo: 'EXPERT',
  fluente: 'ADV',
  avançado: 'ADV',
  intermediário: 'INT',
  básico: 'JR',
};

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-mono text-[10px] tracking-[0.25em] text-highlight-gold uppercase opacity-80">
        {t('title')}
      </h1>

      {/* Two-column: Identity (2/5) + Stack (3/5) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <HudPanel label="IDENTITY" className="md:col-span-2">
          <div className="flex flex-col items-center gap-5 p-6 text-center">
            <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} />

            <div className="flex flex-col gap-2">
              <p className="font-display text-xl font-black tracking-tight">
                {profile.name}
              </p>
              <p className="font-mono text-[10px] tracking-widest text-foreground/60 uppercase">
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

            <div className="flex flex-wrap justify-center gap-2">
              {safeHref(profile.links.github) && (
                <a
                  href={safeHref(profile.links.github)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase hover:text-highlight-gold transition-colors"
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
                    className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase hover:text-highlight-gold transition-colors"
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
                    className="font-mono text-[10px] tracking-widest text-foreground/50 uppercase hover:text-highlight-gold transition-colors"
                  >
                    Email
                  </a>
                </>
              )}
            </div>

            {profile.cvUrl && <CvDownloadButton />}
          </div>
        </HudPanel>

        {profile.skills.length > 0 && (
          <HudPanel label="STACK_INDEX" className="md:col-span-3">
            <div className="flex flex-col gap-4 p-6">
              <h2 className="sr-only">{t('skillsHeading')}</h2>
              {profile.skills.map((skill) => (
                <SkillBar
                  key={skill.name}
                  name={skill.name}
                  level={skill.level}
                />
              ))}
            </div>
          </HudPanel>
        )}
      </div>

      {profile.bio && (
        <HudPanel label="PROFILE_BIO">
          <div className="p-6">
            <h2 className="sr-only">{t('bioHeading')}</h2>
            <p className="leading-relaxed whitespace-pre-line opacity-80">
              {profile.bio}
            </p>
          </div>
        </HudPanel>
      )}

      {profile.languages.length > 0 && (
        <HudPanel label="LANGUAGES">
          <div className="flex flex-col gap-4 p-6">
            <h2 className="sr-only">{t('languagesHeading')}</h2>
            {profile.languages.map((lang) => (
              <SkillBar
                key={lang.language}
                name={lang.language}
                level={LANG_LEVEL_MAP[lang.level]}
                displayLabel={lang.level}
              />
            ))}
          </div>
        </HudPanel>
      )}
    </div>
  );
}
