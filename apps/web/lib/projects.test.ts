import { getPublishedProjects } from './projects';

describe('getPublishedProjects', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
  });

  it('requests the given locale and returns the parsed list', async () => {
    process.env.API_URL = 'https://api.exemplo.com';
    const projects = [{ id: '1', slug: 'a' }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(projects),
    }) as unknown as typeof fetch;

    const result = await getPublishedProjects('pt');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/projects?locale=pt',
      { cache: 'no-store' },
    );
    expect(result).toEqual(projects);
  });

  it('throws when the response is not ok, instead of returning bad data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    }) as unknown as typeof fetch;

    await expect(getPublishedProjects('pt')).rejects.toThrow('500');
  });
});
