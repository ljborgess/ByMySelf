import { useTranslations } from 'next-intl';

/**
 * Placeholder, replaced by the Home Page sub-issue.
 *
 * It exists so `/pt` resolves rather than 404-ing, which is what lets the
 * shared layout actually be seen and verified. The real home page (hero,
 * section cards) is built next.
 */
export default function HomePage() {
  const t = useTranslations('site');

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('name')}
      </h1>
      <p className="mt-2 opacity-70">{t('tagline')}</p>
    </section>
  );
}
