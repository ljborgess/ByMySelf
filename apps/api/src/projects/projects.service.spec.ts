import { InternalServerErrorException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const EMPTY_PINNED = { data: { user: { pinnedItems: { nodes: [] } } } };

describe('ProjectsService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('maps the GraphQL pinnedItems response into PinnedRepo[]', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: {
          user: {
            pinnedItems: {
              nodes: [
                {
                  name: 'bymyself',
                  description: 'Personal portfolio',
                  url: 'https://github.com/ljborgess/bymyself',
                  homepageUrl: 'https://bymyself.com.br',
                  openGraphImageUrl:
                    'https://opengraph.githubassets.com/1/ljborgess/bymyself',
                  languages: {
                    nodes: [{ name: 'TypeScript' }, { name: 'CSS' }],
                  },
                },
              ],
            },
          },
        },
      }),
    );

    const service = new ProjectsService();
    const repos = await service.findPinnedRepos();

    expect(repos).toEqual([
      {
        name: 'bymyself',
        description: 'Personal portfolio',
        url: 'https://github.com/ljborgess/bymyself',
        homepageUrl: 'https://bymyself.com.br',
        imageUrl: 'https://opengraph.githubassets.com/1/ljborgess/bymyself',
        techStack: ['TypeScript', 'CSS'],
      },
    ]);
  });

  it('caches the result and does not refetch within the TTL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(EMPTY_PINNED));

    const service = new ProjectsService();
    await service.findPinnedRepos();
    await service.findPinnedRepos();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent callers into a single GitHub request', async () => {
    let resolveFetch!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const service = new ProjectsService();
    const first = service.findPinnedRepos();
    const second = service.findPinnedRepos();

    resolveFetch(jsonResponse(EMPTY_PINNED));

    await expect(first).resolves.toEqual([]);
    await expect(second).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the network request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const service = new ProjectsService();

    await expect(service.findPinnedRepos()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when the response body is not valid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    const service = new ProjectsService();

    await expect(service.findPinnedRepos()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when the HTTP response is not ok', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Bad credentials' }, false, 401),
    );

    const service = new ProjectsService();

    await expect(service.findPinnedRepos()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when GraphQL returns errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ errors: [{ message: 'bad credentials' }] }),
    );

    const service = new ProjectsService();

    await expect(service.findPinnedRepos()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when the user is not found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { user: null } }));

    const service = new ProjectsService();

    await expect(service.findPinnedRepos()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('serves the stale cache instead of throwing when a later refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          user: {
            pinnedItems: {
              nodes: [
                {
                  name: 'bymyself',
                  description: null,
                  url: 'https://github.com/ljborgess/bymyself',
                  homepageUrl: null,
                  openGraphImageUrl:
                    'https://opengraph.githubassets.com/1/ljborgess/bymyself',
                  languages: { nodes: [] },
                },
              ],
            },
          },
        },
      }),
    );

    const service = new ProjectsService();
    const firstResult = await service.findPinnedRepos();

    // Simulates the cache TTL elapsing: findPinnedRepos only re-fetches once
    // `this.cache.expiresAt` is in the past, so the private field is poked
    // directly rather than waiting an hour in a unit test.
    (service as unknown as { cache: { expiresAt: number } }).cache.expiresAt =
      0;
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(service.findPinnedRepos()).resolves.toEqual(firstResult);
  });
});
