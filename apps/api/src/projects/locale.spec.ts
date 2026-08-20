import { resolveText, toPublicProject } from './locale';
import { Project } from './projects.schema';

function projectRow(overrides: Partial<Project> = {}): Project {
  return {
    id: 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab',
    title: { pt: 'Meu projeto', en: 'My project' },
    description: { pt: 'Descrição', en: 'Description' },
    content: { pt: '# Conteúdo', en: '# Content' },
    slug: 'meu-projeto',
    techStack: ['NestJS'],
    repoUrl: null,
    demoUrl: null,
    coverImageUrl: null,
    status: 'completed',
    featured: true,
    order: 3,
    completedAt: '2026-03-01',
    deletedAt: null,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    updatedAt: new Date('2026-08-02T10:00:00Z'),
    ...overrides,
  };
}

/** RF-PROJ6 -- the fallback rule, and the reason this file exists. */
describe('resolveText', () => {
  it('returns the English text when the translation exists', () => {
    expect(resolveText({ pt: 'Olá', en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('returns the Portuguese text for the pt locale', () => {
    expect(resolveText({ pt: 'Olá', en: 'Hello' }, 'pt')).toBe('Olá');
  });

  it('falls back to pt when the translation is absent', () => {
    expect(resolveText({ pt: 'Olá' }, 'en')).toBe('Olá');
  });

  it.each([[''], ['   '], ['\n\t']])(
    'falls back to pt when the translation is blank (%j)',
    (en) => {
      expect(resolveText({ pt: 'Olá', en }, 'en')).toBe('Olá');
    },
  );

  it('never prefers pt over a present translation, even a short one', () => {
    expect(resolveText({ pt: 'Olá', en: 'Hi' }, 'en')).toBe('Hi');
  });

  describe('malformed data, which must not throw', () => {
    // unreachable through the API -- pt is NOT NULL and the schema requires
    // it -- but a hand-written row should not make a public page 500
    it('returns an empty string when pt is missing and so is the translation', () => {
      expect(resolveText({} as never, 'en')).toBe('');
      expect(resolveText({} as never, 'pt')).toBe('');
    });

    it('returns an empty string when pt is blank and there is no translation', () => {
      expect(resolveText({ pt: '   ' }, 'pt')).toBe('');
    });

    it('still uses the translation when only pt is blank', () => {
      expect(resolveText({ pt: '', en: 'Hello' }, 'en')).toBe('Hello');
    });

    it.each([null, undefined])('tolerates a %s field', (value) => {
      expect(resolveText(value, 'en')).toBe('');
    });
  });
});

describe('toPublicProject', () => {
  it('resolves every bilingual field for the requested locale', () => {
    const result = toPublicProject(projectRow(), 'en');

    expect(result.title).toBe('My project');
    expect(result.description).toBe('Description');
    expect(result.content).toBe('# Content');
  });

  it('falls back field by field, not all-or-nothing', () => {
    // a half-translated project is the common real case: the title is done,
    // the long content is not
    const result = toPublicProject(
      projectRow({
        title: { pt: 'Meu projeto', en: 'My project' },
        description: { pt: 'Descrição' },
        content: { pt: '# Conteúdo' },
      }),
      'en',
    );

    expect(result.title).toBe('My project');
    expect(result.description).toBe('Descrição');
    expect(result.content).toBe('# Conteúdo');
  });

  it('never exposes the soft-delete column or the manual ordering', () => {
    const result = toPublicProject(projectRow(), 'pt');

    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('order');
  });

  it('passes the non-localized fields through untouched', () => {
    const row = projectRow({
      techStack: ['NestJS', 'Drizzle'],
      repoUrl: 'https://github.com/exemplo/repo',
      featured: true,
      status: 'completed',
      completedAt: '2026-03-01',
    });

    const result = toPublicProject(row, 'pt');

    expect(result).toMatchObject({
      id: row.id,
      slug: row.slug,
      techStack: ['NestJS', 'Drizzle'],
      repoUrl: 'https://github.com/exemplo/repo',
      demoUrl: null,
      coverImageUrl: null,
      status: 'completed',
      featured: true,
      completedAt: '2026-03-01',
    });
  });
});
