import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locale } from 'next/root-params';
import { ProjectDetail } from '../../../../components/project-detail';
import { profile } from '../../../../content/profile';
import { getProjectBySlug } from '../../../../lib/projects';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projetos/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const currentLocale = await locale();
  const project = await getProjectBySlug(slug, currentLocale);

  if (!project) {
    return {};
  }

  return {
    title: `${project.title} — ${profile.name}`,
    description: project.description,
  };
}

/**
 * RF-PUB2. Rendered fresh on every request, same reasoning as the listing
 * page: the project's content, links and status are owner-curated through
 * the admin panel and can change at any time.
 *
 * A missing/unpublished slug and an API failure are deliberately not the
 * same outcome: `getProjectBySlug` returns `null` only for a real 404, which
 * becomes `notFound()` -- Next's own not-found UI. Anything else (network
 * failure, non-404 error status) is left to throw and bubble into the
 * nearest error boundary, since that is a real outage, not a bad URL.
 */
export default async function ProjectDetailPage({
  params,
}: PageProps<'/[locale]/projetos/[slug]'>) {
  const { slug } = await params;
  const currentLocale = await locale();

  const project = await getProjectBySlug(slug, currentLocale);

  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
