import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';

/**
 * Reads the links from profile.ts rather than holding its own copy, so an
 * address is corrected in one place. `null` entries are dropped, which is how
 * an unset email simply does not render instead of producing a dead link.
 */
interface FooterLink {
  messageKey: string;
  href: string;
}

const EXTERNAL_LINKS: FooterLink[] = [
  { messageKey: 'github', href: profile.links.github },
  { messageKey: 'linkedin', href: profile.links.linkedin },
].flatMap((link) => (link.href ? [{ ...link, href: link.href }] : []));

/**
 * A server component -- nothing here is interactive, so it costs no client
 * JavaScript. The year is rendered on the server, which is correct for a
 * statically generated page: it changes once a year, not per visitor.
 */
export function SiteFooter() {
  const t = useTranslations('footer');

  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="opacity-70">
          © {new Date().getFullYear()} {profile.name}. {t('rights')}
        </p>

        {EXTERNAL_LINKS.length > 0 && (
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
        )}
      </div>
    </footer>
  );
}
