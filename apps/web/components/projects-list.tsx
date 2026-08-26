'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import type { PublicProjectListItem } from '../lib/projects';
import { Carousel } from './carousel';

/**
 * Split out of page.tsx so the list/card/state logic can be rendered (and
 * tested) directly: Next.js does not yet support unit-testing `async` Server
 * Components (App Router testing guide recommends e2e for those instead), so
 * page.tsx stays a thin async wrapper around the fetch, and everything that
 * actually renders -- including the translations -- lives here as a plain
 * component.
 *
 * Renders every published project (not just featured, unlike the home
 * preview in featured-projects.tsx) in the Carousel from #112 --
 * docs/design-aurora-futurista.md replaces the static grid this used to be
 * with the carousel as the primary listing here.
 *
 * 'use client': Carousel is a Client Component, and `getKey`/`renderItem`
 * below are functions -- Server Components cannot pass functions as props
 * to a Client Component (nothing crossing that boundary can be, since
 * props are serialized). Caught live, not by the unit tests: jsdom renders
 * this in isolation and never exercises the actual RSC server/client
 * split, so the failure only showed up running the real dev server (see
 * #115's PR).
 */
export function ProjectsList({
  projects,
  failed,
}: {
  projects: PublicProjectListItem[];
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
        <Carousel
          items={projects}
          getKey={(project) => project.id}
          ariaLabel={t('title')}
          renderItem={(project) => (
            <Link
              href={`/projetos/${project.slug}`}
              // the whole card is the target, not just the title -- a card
              // that looks clickable but only responds on its heading is a
              // trap
              className={`group hover:border-accent focus-visible:border-accent flex h-full flex-col rounded-lg border p-5 transition-colors ${
                project.featured ? 'border-accent' : 'border-white/15'
              }`}
            >
              {project.featured && (
                <span className="text-accent border-accent mb-2 self-start rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
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
                  className="mb-3 aspect-video w-full rounded bg-white/10 object-cover"
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
                      className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          )}
        />
      )}
    </div>
  );
}
