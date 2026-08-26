import type { Metadata } from 'next';
import { locale } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { HomeContent } from '../../../components/home-content';
import { profile } from '../../../content/profile';
import {
  getPublishedProjects,
  type PublicProjectListItem,
} from '../../../lib/projects';
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
 * A failed fetch here just means the featured preview does not render --
 * unlike /projetos, where the fetch failing is the whole page's reason to
 * exist, this is a decorative preview on a page that works fine without it.
 * No error message, no retry affordance: silently falling back to "no
 * featured projects" is indistinguishable from an actually-quiet catalog,
 * and both are fine states for this section to be in.
 */
export default async function HomePage() {
  const currentLocale = await locale();

  let featuredProjects: PublicProjectListItem[] = [];
  let projectCount = 0;

  try {
    const projects = await getPublishedProjects(currentLocale);
    featuredProjects = projects.filter((project) => project.featured);
    projectCount = projects.length;
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
