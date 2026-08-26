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
      // que continuam outline). Texto preto: --accent é sempre #8bc7ff
      // (site é dark-only, ver globals.css), preto rende 11.7:1 de
      // contraste sobre esse azul -- branco falharia.
      className={`${className} bg-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90`}
    >
      {t('downloadCv')}
      <span aria-hidden="true">↓</span>
    </a>
  );
}
