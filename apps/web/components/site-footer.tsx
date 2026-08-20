import { useTranslations } from 'next-intl';
import { profile } from '../content/profile';

interface FooterLink {
  messageKey: string;
  href: string;
  /** mailto: opens a mail client, so a new browser tab makes no sense. */
  external: boolean;
}

/**
 * Built per render rather than once at module scope. Module-scope state
 * derived from configuration looks harmless but freezes at import time,
 * which makes it invisible to anything that changes the profile afterwards
 * -- tests included.
 *
 * Entries with no address are dropped, so an unset link simply does not
 * render instead of becoming a dead one.
 */
function footerLinks(): FooterLink[] {
  const { github, linkedin, email } = profile.links;

  return [
    { messageKey: 'github', href: github, external: true },
    { messageKey: 'linkedin', href: linkedin, external: true },
    {
      messageKey: 'email',
      href: email ? `mailto:${email}` : null,
      external: false,
    },
  ].flatMap((link) => (link.href ? [{ ...link, href: link.href }] : []));
}

/**
 * A server component -- nothing here is interactive, so it costs no client
 * JavaScript. The year is rendered on the server, which is correct for a
 * statically generated page: it changes once a year, not per visitor.
 */
export function SiteFooter() {
  const t = useTranslations('footer');
  const links = footerLinks();

  return (
    <footer className="mt-auto border-t border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="opacity-70">
          © {new Date().getFullYear()} {profile.name}. {t('rights')}
        </p>

        {links.length > 0 && (
          <ul className="flex items-center gap-4">
            {links.map((link) => (
              <li key={link.messageKey}>
                <a
                  href={link.href}
                  {...(link.external
                    ? {
                        target: '_blank',
                        // noreferrer alongside noopener: without it the
                        // target page still learns where the visitor came from
                        rel: 'noopener noreferrer',
                      }
                    : {})}
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
