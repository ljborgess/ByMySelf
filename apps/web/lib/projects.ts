import type { PublicProject, PublicProjectSummary } from '@portfolio/shared';

/**
 * What a card actually needs. Narrower than `PublicProjectSummary` on
 * purpose: that type declares `createdAt`/`updatedAt` as `Date`, but this
 * function hands back `response.json()` verbatim, where every date is still
 * the ISO string it was serialized as -- typing them as `Date` here would
 * be a lie the compiler couldn't catch, since neither field is read.
 */
export type PublicProjectListItem = Omit<
  PublicProjectSummary,
  'createdAt' | 'updatedAt'
>;

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
): Promise<PublicProjectListItem[]> {
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

/**
 * RF-PUB2: full detail for one project, by slug.
 *
 * Returns `null` on a 404 rather than throwing, so the page can call
 * `notFound()` for "does not exist" while still letting a real API/network
 * failure propagate and hit the page's own error handling -- the two are not
 * the same situation and should not look alike to the caller.
 *
 * Never cached, for the same reason as `getPublishedProjects`: the owner can
 * edit or unpublish a project at any time through the admin panel.
 */
export async function getProjectBySlug(
  slug: string,
  locale: string,
): Promise<PublicProject | null> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3100';

  const response = await fetch(
    `${apiUrl}/projects/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    { cache: 'no-store' },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GET /projects/${slug} returned ${response.status}`);
  }

  return response.json();
}
