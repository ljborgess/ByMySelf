import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { PinnedRepo } from '@portfolio/shared';
import { ProjectsList } from '../../../../components/projects-list';
import { profile } from '../../../../content/profile';
import { getPinnedProjects } from '../../../../lib/projects';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * docs/decisao-projetos-github-pins.md. Rendered fresh on every request: the
 * API caches the GitHub call for an hour on its own, so there is nothing to
 * gain from a second layer of staleness here.
 *
 * The fetch is caught here, not left to bubble into Next's error boundary --
 * an API/GitHub outage should still render a page with a message, not a
 * blank one.
 */
export default async function ProjectsPage() {
  let projects: PinnedRepo[] = [];
  let failed = false;

  try {
    projects = await getPinnedProjects();
  } catch (error) {
    failed = true;
    console.error('Failed to load /projects for the Projetos page:', error);
  }

  return <ProjectsList projects={projects} failed={failed} />;
}
