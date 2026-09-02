import robots from './robots';

describe('robots', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://exemplo.com';
  });

  afterEach(() => {
    // assigning `undefined` would coerce to the string "undefined" rather
    // than unsetting the var, and Jest reuses this worker across test files
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
  });

  it('lets crawlers index the public site', () => {
    const { rules } = robots();

    expect(rules).toMatchObject({ userAgent: '*', allow: '/' });
  });

  it('points at the sitemap on the configured public URL', () => {
    expect(robots().sitemap).toBe('https://exemplo.com/sitemap.xml');
  });
});
