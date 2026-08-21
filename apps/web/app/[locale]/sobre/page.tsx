import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { CvDownloadButton } from '../../../components/cv-download-button';
import { ProfileAvatar } from '../../../components/profile-avatar';
import { profile } from '../../../content/profile';
import { withOpenGraph } from '../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');

  return withOpenGraph(
    `${t('title')} — ${profile.name}`,
    // falls back to the headline while the bio is unset, so the page never
    // ships an empty description
    profile.bio ?? profile.headline,
  );
}

/**
 * RF-PUB4 (bio, objetivo, foto, habilidades, idiomas) and RF-PUB7 (CV).
 *
 * Every section renders only when it has content. An empty heading over
 * nothing reads as broken, whereas an absent section simply is not there --
 * so the page looks finished at any stage of filling profile.ts in.
 */
export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
        <ProfileAvatar name={profile.name} photoUrl={profile.photoUrl} />

        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-2 opacity-70">{profile.headline}</p>
          <CvDownloadButton className="mt-4" />
        </div>
      </section>

      {profile.bio && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('bioHeading')}
          </h2>
          {/* whitespace-pre-line so paragraph breaks in the source survive
              without needing markdown here */}
          <p className="mt-3 leading-relaxed whitespace-pre-line opacity-80">
            {profile.bio}
          </p>
        </section>
      )}

      {profile.objective && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('objectiveHeading')}
          </h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line opacity-80">
            {profile.objective}
          </p>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('skillsHeading')}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.languages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            {t('languagesHeading')}
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {profile.languages.map((language) => (
              <li key={language.language} className="text-sm">
                <span className="font-medium">{language.language}</span>
                <span className="opacity-70"> — {language.level}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
