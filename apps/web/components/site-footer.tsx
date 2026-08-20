import { useTranslations } from 'next-intl';

const EXTERNAL_LINKS = [
  { messageKey: 'github', href: 'https://github.com/ljborgess' },
  {
    messageKey: 'linkedin',
    href: 'https://www.linkedin.com/in/lucianoborgess/',
  },
] as const;

/**
 * A server component -- nothing here is interactive, so it costs no client
 * JavaScript. The year is rendered on the server, which is correct for a
 * statically generated page: it changes once a year, not per visitor.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const tSite = useTranslations('site');

  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="opacity-70">
          © {new Date().getFullYear()} {tSite('name')}. {t('rights')}
        </p>

        <ul className="flex items-center gap-4">
          {EXTERNAL_LINKS.map((link) => (
            <li key={link.messageKey}>
              <a
                href={link.href}
                target="_blank"
                // noreferrer alongside noopener: without it the target page
                // still learns where the visitor came from
                rel="noopener noreferrer"
                className="hover:opacity-70"
              >
                {t(`links.${link.messageKey}`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
