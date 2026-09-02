import { getPinnedProjects } from './projects';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const EMPTY_PINNED = { data: { user: { pinnedItems: { nodes: [] } } } };

describe('getPinnedProjects', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  const originalUsername = process.env.GITHUB_USERNAME;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_USERNAME = 'ljborgess';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GITHUB_TOKEN = originalToken;
    process.env.GITHUB_USERNAME = originalUsername;
  });

  it('queries the GitHub GraphQL API with the configured username', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(EMPTY_PINNED));
    global.fetch = fetchMock;

    await getPinnedProjects();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/graphql');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body).variables).toEqual({ login: 'ljborgess' });
    expect(init.next).toEqual({ revalidate: 3600 });
  });

  it('maps the GraphQL pinnedItems response into PinnedRepo[]', async () => {
    global.fetch = jest.fn().mockResolvedValue(
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

    const repos = await getPinnedProjects();

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

  it('throws when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    global.fetch = jest.fn();

    await expect(getPinnedProjects()).rejects.toThrow('GITHUB_TOKEN');
  });

  it('throws when the network request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(getPinnedProjects()).rejects.toThrow(
      'Failed to reach the GitHub GraphQL API',
    );
  });

  it('throws when the response body is not valid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await expect(getPinnedProjects()).rejects.toThrow('not valid JSON');
  });

  it('throws when the HTTP response is not ok', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'Bad credentials' }, false, 401),
      );

    await expect(getPinnedProjects()).rejects.toThrow('401');
  });

  it('throws when GraphQL returns errors', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ errors: [{ message: 'bad credentials' }] }),
      );

    await expect(getPinnedProjects()).rejects.toThrow('GraphQL request failed');
  });

  it('throws when the user is not found', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: { user: null } }));

    await expect(getPinnedProjects()).rejects.toThrow('GraphQL request failed');
  });
});
