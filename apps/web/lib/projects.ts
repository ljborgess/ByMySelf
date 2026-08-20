import type { PublicProjectSummary } from '@portfolio/shared';

/**
 * RF-PUB1: live and not archived, owner's manual order, `featured` included.
 * The frontend does not reimplement locale fallback or ordering -- it
 * renders exactly what the API already resolved for `locale`.
 *
 * Never cached (`no-store`): the list changes whenever the owner edits it
 * through the admin panel, and a stale build-time snapshot would show
 * projects that no longer exist or hide ones just published.
 */
export async function getPublishedProjects(
  locale: string,
): Promise<PublicProjectSummary[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3100';

  const response = await fetch(
    `${apiUrl}/projects?locale=${encodeURIComponent(locale)}`,
    { cache: 'no-store' },
  );

  if (!response.ok) {
    throw new Error(`GET /projects returned ${response.status}`);
  }

  return response.json();
}
