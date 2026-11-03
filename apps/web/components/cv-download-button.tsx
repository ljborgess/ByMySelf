import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';

/**
 * RF-PUB7. A plain `<a download>` pointing at a static file, not a
 * JavaScript-driven fetch, so it still works if client JS fails to load --
 * and so the browser handles the save dialog natively.
 *
 * Renders nothing while `cvUrl` is unset. A button that 404s is worse than an
 * absent one: the visitor blames the site rather than concluding there is no
 * CV to download.
 *
 * One style only, the outline pill. There used to be a `'filled'` variant for
 * the Sobre page -- a rectangular `rounded-md` button filled with the accent
 * red -- but it broke two DESIGN.md rules at once: rectangular buttons belong
 * to the admin panel only (public pages are all pills), and the accent fills
 * a surface only in response to interaction, never at rest.
 */
export function CvDownloadButton({ className = '' }: { className?: string }) {
  const t = useTranslations('about');

  if (!profile.cvUrl) {
    return null;
  }

  return (
    <a
      href={profile.cvUrl}
      download
      className={`${className} signal-glow hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold transition-colors`}
    >
      {t('downloadCv')}
      <span aria-hidden="true">↓</span>
    </a>
  );
}
