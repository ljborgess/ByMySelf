import type { Metadata } from 'next';
import type { PublicProjectSummary } from '@portfolio/shared';
import { locale } from 'next/root-params';
import { getTranslations } from 'next-intl/server';
import { ProjectsList } from '../../../components/projects-list';
import { profile } from '../../../content/profile';
import { getPublishedProjects } from '../../../lib/projects';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects');

  return {
    title: `${t('title')} — ${profile.name}`,
    description: t('description'),
  };
}

/**
 * RF-PUB1. Rendered fresh on every request rather than statically: the list
 * is owner-curated through the admin panel and can change at any time, so a
 * build-time snapshot would go stale.
 *
 * The fetch is caught here, not left to bubble into Next's error boundary --
 * an API outage should still render a page with a message, not a blank one.
 *
 * Kept thin on purpose: Next.js does not yet support unit-testing `async`
 * Server Components, so the actual rendering (including i18n) lives in
 * ProjectsList, a plain component, which is what page.test.tsx exercises.
 */
export default async function ProjectsPage() {
  const currentLocale = await locale();

  let projects: PublicProjectSummary[] = [];
  let failed = false;

  try {
    projects = await getPublishedProjects(currentLocale);
  } catch {
    failed = true;
  }

  return <ProjectsList projects={projects} failed={failed} />;
}
