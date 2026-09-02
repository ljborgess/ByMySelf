import { getPinnedProjects } from './projects';

describe('getPinnedProjects', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
  });

  it('requests /projects and returns the parsed list', async () => {
    process.env.API_URL = 'https://api.exemplo.com';
    const repos = [
      { name: 'bymyself', url: 'https://github.com/ljborgess/bymyself' },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(repos),
    }) as unknown as typeof fetch;

    const result = await getPinnedProjects();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/projects',
      {
        cache: 'no-store',
      },
    );
    expect(result).toEqual(repos);
  });

  it('throws when the response is not ok, instead of returning bad data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    }) as unknown as typeof fetch;

    await expect(getPinnedProjects()).rejects.toThrow('500');
  });
});
