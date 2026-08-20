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
      className={`${className} inline-flex items-center gap-2 rounded-md border border-black/15 px-4 py-2 text-sm font-medium transition-colors hover:border-black/40 dark:border-white/20 dark:hover:border-white/50`}
    >
      {t('downloadCv')}
      <span aria-hidden="true">↓</span>
    </a>
  );
}
