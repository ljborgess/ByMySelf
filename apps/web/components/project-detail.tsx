'use client';

import type { PublicProject } from '@portfolio/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import gsap from 'gsap';
import { safeHref } from '../lib/urls';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

/**
 * Split out of page.tsx for the same reason ProjectsList is: Next.js does
 * not support unit-testing `async` Server Components, so page.tsx stays a
 * thin wrapper around the fetch and the notFound() check, and everything
 * that actually renders lives here as a plain, testable component.
 *
 * 'use client': a one-time fade+offset on the header block on mount, same
 * pattern as hero-section.tsx (not scroll-triggered -- it's the first thing
 * visible, like the hero). The markdown body stays static: animating it
 * paragraph by paragraph would fight a reader who is trying to read, not
 * scroll past a showcase (grilling 2026-09-02).
 */
export function ProjectDetail({ project }: { project: PublicProject }) {
  const t = useTranslations('projectDetail');
  const tProjects = useTranslations('projects');
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReducedMotion) return;

    const stages = container.querySelectorAll('[data-stage]');
    const tl = gsap.timeline();
    tl.from(stages, {
      y: 24,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power2.out',
    });

    // .revert(), not .kill() (#135): React 18 Strict Mode double-invokes
    // this effect in dev, and killing a .from()-based tween leaves its
    // starting values as frozen inline styles.
    return () => {
      tl.revert();
    };
  }, []);

  return (
    <article ref={containerRef} className="flex flex-col gap-6">
      <div data-stage>
        {project.featured && (
          <span className="text-accent border-accent mb-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
            {tProjects('featured')}
          </span>
        )}

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {project.title}
        </h1>
        <p className="mt-2 text-base opacity-70">{project.description}</p>
      </div>

      {project.coverImageUrl && (
        // plain <img>, not next/image: same reasoning as the listing card --
        // the optimizer would need remotePatterns wide enough to cover any
        // URL the owner pastes in
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-stage
          src={project.coverImageUrl}
          alt={project.title}
          className="aspect-video w-full rounded-lg bg-white/10 object-cover"
        />
      )}

      {(project.repoUrl || project.demoUrl) && (
        <div className="flex flex-wrap gap-3">
          {safeHref(project.repoUrl) && (
            <a
              href={safeHref(project.repoUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="signal-glow hover:border-accent hover:text-accent inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium"
            >
              {t('repo')}
              <span aria-hidden="true">↗</span>
            </a>
          )}

          {safeHref(project.demoUrl) && (
            <a
              href={safeHref(project.demoUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="signal-glow hover:border-accent hover:text-accent inline-flex items-center gap-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium"
            >
              {t('demo')}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      {project.techStack.length > 0 && (
        <ul className="flex flex-wrap gap-2">
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

      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {project.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
