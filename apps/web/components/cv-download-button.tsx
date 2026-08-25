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
      // CTA primária da página: preenchida em vez de outline, pra se
      // destacar dos links secundários (repo/demo em project-detail.tsx,
      // que continuam outline). Texto claro/escuro invertido de propósito:
      // o acento é escuro no tema claro (#0457c2) e claro no escuro
      // (#8bc7ff) -- ver globals.css -- então o texto precisa da cor oposta
      // em cada um pra manter contraste AA.
      className={`${className} bg-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:text-black`}
    >
      {t('downloadCv')}
      <span aria-hidden="true">↓</span>
    </a>
  );
}
