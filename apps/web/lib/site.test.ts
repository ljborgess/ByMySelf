import { defaultOgImage, getSiteUrl, withOpenGraph } from './site';

describe('getSiteUrl', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    // assigning `undefined` would coerce to the string "undefined" rather
    // than unsetting the var, and Jest reuses this worker across test files
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
  });

  it('falls back to localhost when unset, so dev needs no configuration', () => {
    delete process.env.FRONTEND_URL;

    expect(getSiteUrl()).toBe('http://localhost:3101');
  });

  it('uses the configured URL', () => {
    process.env.FRONTEND_URL = 'https://exemplo.com';

    expect(getSiteUrl()).toBe('https://exemplo.com');
  });

  it('strips a trailing slash so callers can concatenate paths', () => {
    process.env.FRONTEND_URL = 'https://exemplo.com/';

    expect(getSiteUrl()).toBe('https://exemplo.com');
  });

  it('names the variable when the value is not a URL', () => {
    // the root layout builds `metadataBase` from this at module scope, so a
    // bad value fails every route -- the message has to point at the cause
    process.env.FRONTEND_URL = 'not a url';

    expect(getSiteUrl).toThrow(/FRONTEND_URL/);
  });

  it('rejects a non-http(s) scheme', () => {
    process.env.FRONTEND_URL = 'javascript:alert(1)';

    expect(getSiteUrl).toThrow(/http\(s\)/);
  });
});

describe('withOpenGraph', () => {
  it('mirrors title and description into openGraph', () => {
    // Next does not do this mirroring itself, and a page-level openGraph
    // object replaces the parent's rather than merging with it
    const meta = withOpenGraph('Projetos — Fulano', 'Uma descrição.');

    expect(meta.title).toBe('Projetos — Fulano');
    expect(meta.description).toBe('Uma descrição.');
    expect(meta.openGraph).toMatchObject({
      title: 'Projetos — Fulano',
      description: 'Uma descrição.',
    });
  });

  it('uses the default image when none is given', () => {
    const meta = withOpenGraph('Título', 'Descrição');

    expect(meta.openGraph?.images).toEqual([defaultOgImage]);
  });

  it('lets a page override the image, for the project detail cover', () => {
    const meta = withOpenGraph(
      'Projeto',
      'Descrição',
      'https://exemplo.com/capa.png',
    );

    expect(meta.openGraph?.images).toEqual(['https://exemplo.com/capa.png']);
  });
});
