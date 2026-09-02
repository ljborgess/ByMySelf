'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link } from '../i18n/navigation';
import type { PublicProjectListItem } from '../lib/projects';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Split out of page.tsx so the list/card/state logic can be rendered (and
 * tested) directly: Next.js does not yet support unit-testing `async` Server
 * Components (App Router testing guide recommends e2e for those instead), so
 * page.tsx stays a thin async wrapper around the fetch, and everything that
 * actually renders -- including the translations -- lives here as a plain
 * component.
 *
 * Renders every published project (not just featured, unlike the home
 * preview in featured-projects.tsx) as an asymmetric mosaic grid (#132,
 * docs/design-clone-syahril.md's "Journal & Insights" section) -- a featured
 * project spans two columns instead of every card being the same size, which
 * is what made the previous carousel (#109-#115) necessary in the first
 * place.
 *
 * 'use client': the scroll-triggered reveal (same stagger pattern as
 * featured-projects.tsx/section-cards.tsx -- grilling 2026-09-02 found this
 * was the last content page on the site with no animation at all).
 */
export function ProjectsList({
  projects,
  failed,
}: {
  projects: PublicProjectListItem[];
  failed: boolean;
}) {
  const t = useTranslations('projects');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    const cards = list.querySelectorAll('[data-reveal-card]');
    if (!cards.length) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    });

    // y only, never opacity (#135) -- same rule every other reveal in the
    // codebase follows.
    tl.from(cards, {
      y: 24,
      stagger: 0.08,
      duration: 0.6,
      ease: 'power2.out',
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.revert();
    };
  }, [projects]);

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
        <ul
          ref={listRef}
          className="grid grid-cols-1 gap-4 [grid-auto-flow:dense] sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((project) => (
            <li
              key={project.id}
              data-reveal-card
              className={project.featured ? 'sm:col-span-2' : undefined}
            >
              <Link
                href={`/projetos/${project.slug}`}
                // the whole card is the target, not just the title -- a card
                // that looks clickable but only responds on its heading is a
                // trap
                className={`signal-glow group hover:border-accent focus-visible:border-accent flex h-full flex-col rounded-lg border p-5 transition-[color,border-color,transform] hover:-translate-y-0.5 ${
                  project.featured
                    ? 'signal-glow-active border-accent'
                    : 'border-white/15'
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
