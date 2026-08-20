import type { PublicProjectSummary } from '@portfolio/shared';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';

/**
 * Split out of page.tsx so the list/card/state logic can be rendered (and
 * tested) directly: Next.js does not yet support unit-testing `async` Server
 * Components (App Router testing guide recommends e2e for those instead), so
 * page.tsx stays a thin async wrapper around the fetch, and everything that
 * actually renders -- including the translations -- lives here as a plain
 * component.
 */
export function ProjectsList({
  projects,
  failed,
}: {
  projects: PublicProjectSummary[];
  failed: boolean;
}) {
  const t = useTranslations('projects');

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>

      {failed ? (
        <p className="opacity-70">{t('error')}</p>
      ) : projects.length === 0 ? (
        <p className="opacity-70">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projetos/${project.slug}`}
                // the whole card is the target, not just the title -- a card
                // that looks clickable but only responds on its heading is a
                // trap
                className={`group flex h-full flex-col rounded-lg border p-5 transition-colors ${
                  project.featured
                    ? 'border-black/30 dark:border-white/40'
                    : 'border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40'
                }`}
              >
                {project.featured && (
                  <span className="mb-2 self-start rounded-full border border-current px-2 py-0.5 text-xs font-medium tracking-wide uppercase opacity-70">
                    {t('featured')}
                  </span>
                )}

                {project.coverImageUrl && (
                  // plain <img>, not next/image: the optimizer would need
                  // remotePatterns wide enough to cover any URL the owner
                  // pastes in, which turns /_next/image into an open proxy
                  // for whatever host a request's `url` param names
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.coverImageUrl}
                    alt={project.title}
                    loading="lazy"
                    className="mb-3 aspect-video w-full rounded bg-black/5 object-cover dark:bg-white/10"
                  />
                )}

                <span className="text-base font-semibold tracking-tight">
                  {project.title}
                </span>
                <p className="mt-1 text-sm opacity-70">{project.description}</p>

                {project.techStack.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <li
                        key={tech}
                        className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs dark:border-white/15"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
