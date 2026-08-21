import type { PublicProjectListItem } from '../lib/projects';
import { getPublishedProjects } from '../lib/projects';
import sitemap from './sitemap';

jest.mock('../lib/projects', () => ({
  getPublishedProjects: jest.fn(),
}));

const mockGetPublishedProjects = getPublishedProjects as jest.MockedFunction<
  typeof getPublishedProjects
>;

function project(slug: string): PublicProjectListItem {
  return {
    id: slug,
    slug,
    title: slug,
    description: '',
    techStack: [],
    repoUrl: null,
    demoUrl: null,
    coverImageUrl: null,
    status: 'completed',
    featured: false,
    completedAt: null,
  };
}

describe('sitemap', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://exemplo.com';
  });

  afterEach(() => {
    // Assigning `undefined` would coerce to the string "undefined" instead
    // of unsetting the var, and Jest reuses this worker process across test
    // files -- a later suite's `getSiteUrl()` would then read that literal
    // string instead of falling back to the localhost default.
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
    jest.resetAllMocks();
  });

  it('includes every static public route', async () => {
    mockGetPublishedProjects.mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://exemplo.com/pt',
        'https://exemplo.com/pt/sobre',
        'https://exemplo.com/pt/formacao',
        'https://exemplo.com/pt/certificados',
        'https://exemplo.com/pt/projetos',
      ]),
    );
  });

  it('adds one entry per published project slug', async () => {
    mockGetPublishedProjects.mockResolvedValue([
      project('projeto-a'),
      project('projeto-b'),
    ]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://exemplo.com/pt/projetos/projeto-a',
        'https://exemplo.com/pt/projetos/projeto-b',
      ]),
    );
    // 5 static routes + 2 project routes
    expect(entries).toHaveLength(7);
  });

  it('still returns the static routes when the API fetch fails', async () => {
    mockGetPublishedProjects.mockRejectedValue(new Error('down'));

    const entries = await sitemap();

    expect(entries).toHaveLength(5);
    expect(entries.some((entry) => entry.url.includes('/projetos/'))).toBe(
      false,
    );
  });
});
