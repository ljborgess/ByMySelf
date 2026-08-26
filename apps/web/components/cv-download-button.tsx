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
 * `variant`: `'filled'` (default) is the Sobre page's primary CTA -- solid,
 * to stand out from the outline secondary links (repo/demo in
 * project-detail.tsx). `'outline'` is the footer CTA's (#134) pill style,
 * paired there with the filled "Hire Me" mailto button -- reused rather than
 * duplicated, just adapted.
 */
export function CvDownloadButton({
  className = '',
  variant = 'filled',
}: {
  className?: string;
  variant?: 'filled' | 'outline';
}) {
  const t = useTranslations('about');

  if (!profile.cvUrl) {
    return null;
  }

  // Texto preto no filled: --accent é var(--highlight-red) (#ef4444, ver
  // globals.css) desde o épico #123 -- preto rende ~5.6:1 de contraste
  // sobre esse vermelho (WCAG AA precisa de 4.5:1), branco cairia pra
  // ~3.7:1 e falharia.
  const variantClassName =
    variant === 'filled'
      ? 'bg-accent rounded-md px-4 py-2 font-medium text-black hover:opacity-90'
      : 'rounded-full border border-white/30 px-5 py-2.5 font-semibold hover:border-accent hover:text-accent';

  return (
    <a
      href={profile.cvUrl}
      download
      className={`${className} ${variantClassName} inline-flex items-center gap-2 text-sm transition-colors`}
    >
      {t('downloadCv')}
      <span aria-hidden="true">↓</span>
    </a>
  );
}
