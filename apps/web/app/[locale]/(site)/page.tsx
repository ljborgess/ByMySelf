import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeContent } from '../../../components/home-content';
import { profile } from '../../../content/profile';
import { getPinnedProjects, type PinnedRepo } from '../../../lib/projects';
import { withOpenGraph } from '../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');

  return withOpenGraph(
    `${profile.name} — ${profile.headline}`,
    t('description'),
  );
}

/**
 * Thin async wrapper, same split as ProjectsPage/ProjectsList: Next.js does
 * not support unit-testing `async` Server Components, so the actual
 * rendering lives in HomeContent (a plain component), which is what
 * home-content.test.tsx exercises.
 *
 * Every pinned repo is already the curated set (docs/decisao-projetos
 * -github-pins.md -- no separate "featured" flag exists anymore, GitHub
 * caps a profile at 6 pins), so the home preview shows all of them.
 *
 * A failed fetch here just means the preview does not render -- unlike
 * /projetos, where the fetch failing is the whole page's reason to exist,
 * this is a decorative preview on a page that works fine without it.
 */
export default async function HomePage() {
  let featuredProjects: PinnedRepo[] = [];
  let projectCount = 0;

  try {
    featuredProjects = await getPinnedProjects();
    projectCount = featuredProjects.length;
  } catch (error) {
    console.error('Failed to load featured projects for the home page:', error);
  }

  return (
    <HomeContent
      featuredProjects={featuredProjects}
      projectCount={projectCount}
    />
  );
}
