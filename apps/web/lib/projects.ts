const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * 1h (docs/decisao-projetos-github-pins.md): pins change rarely, and this
 * keeps GitHub's GraphQL rate limit (5000 req/h authenticated) far out of
 * reach regardless of site traffic.
 *
 * Next's `fetch` cache (not a hand-rolled in-memory one) is what actually
 * makes this safe on a serverless platform (docs/decisao-deploy-vercel.md):
 * a module-level `Map` would not reliably survive between invocations on
 * Vercel, and `fetch`'s own request memoization already coalesces
 * concurrent callers within a render pass -- both problems the previous
 * NestJS proxy solved by hand are the platform's job now.
 */
const CACHE_REVALIDATE_SECONDS = 60 * 60;

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

/**
 * `/projetos` shows the owner's pinned repositories, straight from GitHub
 * (docs/decisao-projetos-github-pins.md). No database, no admin CRUD: the
 * curation already happened when the owner pinned the repo on their GitHub
 * profile.
 */
export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  /** `Repository.openGraphImageUrl` -- the social preview GitHub already
   * generates per repo (custom if the owner set one). Used as the card's
   * "amostra". */
  imageUrl: string;
  /** Repo languages by byte size, most-used first, capped for card display. */
  techStack: string[];
}

/**
 * Fetches the owner's pinned GitHub repos directly via GraphQL -- no
 * separate API service since docs/decisao-deploy-vercel.md folded the old
 * NestJS proxy into this app. Server-only: `GITHUB_TOKEN` never reaches the
 * client bundle because this file is only ever imported from Server
 * Components.
 */
export async function getPinnedProjects(): Promise<PinnedRepo[]> {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;

  if (!token || !username) {
    throw new Error(
      'GITHUB_TOKEN e GITHUB_USERNAME precisam estar definidos -- ver .env.example',
    );
  }

  let response: Response;
  try {
    response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PINNED_ITEMS_QUERY,
        variables: { login: username },
      }),
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });
  } catch (error) {
    throw new Error('Failed to reach the GitHub GraphQL API', { cause: error });
  }

  let body: PinnedItemsResponse;
  try {
    body = (await response.json()) as PinnedItemsResponse;
  } catch (error) {
    throw new Error(
      `GitHub GraphQL response was not valid JSON (status ${response.status})`,
      { cause: error },
    );
  }

  if (!response.ok || body.errors?.length || !body.data?.user) {
    throw new Error(
      `GitHub GraphQL request failed: ${response.status} ${JSON.stringify(
        body.errors ?? body,
      )}`,
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
