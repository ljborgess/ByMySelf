import sitemap from './sitemap';

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
  });

  it('includes every static public route', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      'https://exemplo.com/pt',
      'https://exemplo.com/pt/sobre',
      'https://exemplo.com/pt/credenciais',
      'https://exemplo.com/pt/projetos',
    ]);
  });

  it('does not restamp the routes on every request', () => {
    const first = sitemap();
    const second = sitemap();

    expect(second[0].lastModified).toEqual(first[0].lastModified);
  });
});
