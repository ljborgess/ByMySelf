import type { PublicProjectSummary } from '@portfolio/shared';

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
