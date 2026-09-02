import type { PinnedRepo } from '@portfolio/shared';

/**
 * Fetches the owner's pinned GitHub repos through the API's `/projects`
 * proxy (docs/decisao-projetos-github-pins.md). The API already caches this
 * for an hour, so this fetch stays uncached (`no-store`) -- a second layer
 * of staleness here would only widen the window without any benefit, since
 * the API is the one paying the GitHub rate-limit cost either way.
 */
export async function getPinnedProjects(): Promise<PinnedRepo[]> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3100';

  const response = await fetch(`${apiUrl}/projects`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`GET /projects returned ${response.status}`);
  }

  return response.json();
}
