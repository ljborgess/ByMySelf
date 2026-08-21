import { getProjectBySlug, getPublishedProjects } from './projects';

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

describe('getProjectBySlug', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.API_URL = originalApiUrl;
  });

  it('requests the given slug and locale, and returns the parsed project', async () => {
    process.env.API_URL = 'https://api.exemplo.com';
    const project = { id: '1', slug: 'a', content: '# Título' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(project),
    }) as unknown as typeof fetch;

    const result = await getProjectBySlug('a', 'pt');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/projects/a?locale=pt',
      { cache: 'no-store' },
    );
    expect(result).toEqual(project);
  });

  it('returns null on a 404, so the caller can render not-found instead of throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(null),
    }) as unknown as typeof fetch;

    await expect(getProjectBySlug('inexistente', 'pt')).resolves.toBeNull();
  });

  it('throws on a non-404 failure, since that is an outage, not a bad slug', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    }) as unknown as typeof fetch;

    await expect(getProjectBySlug('a', 'pt')).rejects.toThrow('500');
  });
});
