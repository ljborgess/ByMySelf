import type { PublicProjectListItem } from '../lib/projects';
import { getPublishedProjects } from '../lib/projects';
import sitemap from './sitemap';

jest.mock('../lib/projects', () => ({
  getPublishedProjects: jest.fn(),
}));

const mockGetPublishedProjects = getPublishedProjects as jest.MockedFunction<
  typeof getPublishedProjects
>;

function project(
  slug: string,
  updatedAt = '2026-01-01T00:00:00.000Z',
): PublicProjectListItem {
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
    updatedAt,
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

  describe('lastModified', () => {
    it("reports the project's own last edit, not the request time", async () => {
      // a lastmod that always says "just now" is one search engines learn
      // to discount, which costs the exact signal RF-SEO3 wants to send
      mockGetPublishedProjects.mockResolvedValue([
        project('projeto-a', '2026-03-14T10:00:00.000Z'),
      ]);

      const entry = (await sitemap()).find((candidate) =>
        candidate.url.endsWith('/projeto-a'),
      );

      expect(entry?.lastModified).toEqual(new Date('2026-03-14T10:00:00.000Z'));
    });

    it('falls back to a valid date when the API sends an unparseable one', async () => {
      mockGetPublishedProjects.mockResolvedValue([
        project('projeto-a', 'não é uma data'),
      ]);

      const entry = (await sitemap()).find((candidate) =>
        candidate.url.endsWith('/projeto-a'),
      );

      // an invalid Date serializes to null and would emit a broken <lastmod>
      expect(entry?.lastModified).toBeInstanceOf(Date);
      expect(Number.isNaN((entry?.lastModified as Date).getTime())).toBe(false);
    });

    it('does not restamp the static routes on every request', async () => {
      mockGetPublishedProjects.mockResolvedValue([]);

      const first = await sitemap();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await sitemap();

      expect(second[0].lastModified).toEqual(first[0].lastModified);
    });
  });
});
