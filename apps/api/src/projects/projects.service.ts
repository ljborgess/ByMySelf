import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { PinnedRepo } from '@portfolio/shared';
import { env } from '../config/env';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * 1h (docs/decisao-projetos-github-pins.md): pins change rarely, and this
 * keeps GitHub's GraphQL rate limit (5000 req/h authenticated) far out of
 * reach regardless of site traffic.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Last-resort ceiling so a wedged GitHub request cannot hang every concurrent
 * `/projects` caller -- an outage should fail fast, not hold the connection
 * open indefinitely.
 */
const FETCH_TIMEOUT_MS = 10_000;

/** Up to 6 -- GitHub caps a profile at 6 pinned items. */
const PINNED_ITEMS_QUERY = `
  query PinnedRepos($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            homepageUrl
            openGraphImageUrl
            languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  }
`;

interface PinnedItemsResponse {
  data?: {
    user: {
      pinnedItems: {
        nodes: Array<{
          name: string;
          description: string | null;
          url: string;
          homepageUrl: string | null;
          openGraphImageUrl: string;
          languages: { nodes: Array<{ name: string }> };
        }>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private cache: { expiresAt: number; repos: PinnedRepo[] } | null = null;
  // Coalesces concurrent callers that arrive while the cache is expired into
  // one outbound GitHub request instead of one per caller -- without this, a
  // burst of visitors hitting the cache's expiry moment each fire their own
  // GraphQL call and race to overwrite `this.cache`.
  private inFlight: Promise<PinnedRepo[]> | null = null;

  async findPinnedRepos(): Promise<PinnedRepo[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.repos;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.refreshCache().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /**
   * On failure, serves the last known-good list instead of a 500 -- a stale
   * project listing during a GitHub outage is strictly better UX than an
   * error page for what is a decorative section of the site.
   */
  private async refreshCache(): Promise<PinnedRepo[]> {
    try {
      const repos = await this.fetchPinnedRepos();
      this.cache = { expiresAt: Date.now() + CACHE_TTL_MS, repos };
      return repos;
    } catch (error) {
      if (this.cache) {
        this.logger.warn(
          'Serving stale pinned repos after a failed GitHub refresh',
        );
        return this.cache.repos;
      }
      throw error;
    }
  }

  private async fetchPinnedRepos(): Promise<PinnedRepo[]> {
    let response: Response;
    try {
      response = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: PINNED_ITEMS_QUERY,
          variables: { login: env.GITHUB_USERNAME },
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error('Failed to reach the GitHub GraphQL API', error);
      throw new InternalServerErrorException(
        'Não foi possível carregar os projetos do GitHub',
      );
    }

    let body: PinnedItemsResponse;
    try {
      body = (await response.json()) as PinnedItemsResponse;
    } catch (error) {
      this.logger.error(
        `GitHub GraphQL response was not valid JSON (status ${response.status})`,
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível carregar os projetos do GitHub',
      );
    }

    if (!response.ok || body.errors?.length || !body.data?.user) {
      this.logger.error(
        `GitHub GraphQL request failed: ${response.status} ${JSON.stringify(
          body.errors ?? body,
        )}`,
      );
      throw new InternalServerErrorException(
        'Não foi possível carregar os projetos do GitHub',
      );
    }

    return body.data.user.pinnedItems.nodes.map((repo) => ({
      name: repo.name,
      description: repo.description,
      url: repo.url,
      homepageUrl: repo.homepageUrl || null,
      imageUrl: repo.openGraphImageUrl,
      techStack: repo.languages.nodes.map((language) => language.name),
    }));
  }
}
