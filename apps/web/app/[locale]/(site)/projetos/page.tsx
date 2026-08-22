import type { Metadata } from 'next';
import { locale } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { ProjectsList } from '../../../../components/projects-list';
import { profile } from '../../../../content/profile';
import {
  getPublishedProjects,
  type PublicProjectListItem,
} from '../../../../lib/projects';
import { withOpenGraph } from '../../../../lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects');

  return withOpenGraph(`${t('title')} — ${profile.name}`, t('description'));
}

/**
 * RF-PUB1. Rendered fresh on every request rather than statically: the list
 * is owner-curated through the admin panel and can change at any time, so a
 * build-time snapshot would go stale.
 *
 * The fetch is caught here, not left to bubble into Next's error boundary --
 * an API outage should still render a page with a message, not a blank one.
 * Logged rather than silently swallowed, so a misconfigured API_URL or a
 * down backend leaves a trace to diagnose instead of just "no projects".
 *
 * Kept thin on purpose: Next.js does not yet support unit-testing `async`
 * Server Components, so the actual rendering (including i18n) lives in
 * ProjectsList, a plain component, which is what projects-list.test.tsx
 * exercises.
 */
export default async function ProjectsPage() {
  const currentLocale = await locale();

  let projects: PublicProjectListItem[] = [];
  let failed = false;

  try {
    projects = await getPublishedProjects(currentLocale);
  } catch (error) {
    failed = true;
    console.error('Failed to load /projects for the Projetos page:', error);
  }

  return <ProjectsList projects={projects} failed={failed} />;
}
