import { makeAdminProject } from './admin-project.fixture';
import {
  EMPTY_PROJECT_FORM,
  missingTranslations,
  toFormValues,
  toPayload,
  validateProjectForm,
  type ProjectFormValues,
} from './project-form';

function values(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    ...EMPTY_PROJECT_FORM,
    title: { pt: 'Meu projeto', en: '' },
    description: { pt: 'Uma descrição.', en: '' },
    content: { pt: '# Conteúdo', en: '' },
    slug: 'meu-projeto',
    ...overrides,
  };
}

describe('toFormValues', () => {
  it('pre-fills every field from an existing project (RF-PROJ2)', () => {
    const project = makeAdminProject({
      slug: 'api-de-pedidos',
      title: { pt: 'API de pedidos', en: 'Orders API' },
      description: { pt: 'Curta.', en: 'Short.' },
      content: { pt: '# Detalhe', en: '# Detail' },
      techStack: ['NestJS', 'PostgreSQL'],
      repoUrl: 'https://github.com/exemplo/api',
      demoUrl: 'https://exemplo.com',
      coverImageUrl: 'https://exemplo.com/capa.png',
      status: 'completed',
      featured: true,
      completedAt: '2026-03-01',
    });

    expect(toFormValues(project)).toEqual({
      title: { pt: 'API de pedidos', en: 'Orders API' },
      description: { pt: 'Curta.', en: 'Short.' },
      content: { pt: '# Detalhe', en: '# Detail' },
      slug: 'api-de-pedidos',
      techStack: ['NestJS', 'PostgreSQL'],
      repoUrl: 'https://github.com/exemplo/api',
      demoUrl: 'https://exemplo.com',
      coverImageUrl: 'https://exemplo.com/capa.png',
      status: 'completed',
      featured: true,
      completedAt: '2026-03-01',
    });
  });

  /**
   * Um `<input>` controlado com `value={undefined}` passa a não-controlado: o
   * React avisa no console e o campo para de responder ao estado.
   */
  it('turns every absent value into an empty string, never undefined', () => {
    const result = toFormValues(makeAdminProject());

    expect(result.repoUrl).toBe('');
    expect(result.demoUrl).toBe('');
    expect(result.coverImageUrl).toBe('');
    expect(result.completedAt).toBe('');
    expect(result.title.en).toBe('');
  });

  it('copies techStack instead of aliasing the project', () => {
    const project = makeAdminProject({ techStack: ['NestJS'] });

    toFormValues(project).techStack.push('Next.js');

    // editar o formulário não pode mexer no objeto que veio da API
    expect(project.techStack).toEqual(['NestJS']);
  });
});

describe('missingTranslations', () => {
  it('names the fields still without English (user story 4)', () => {
    expect(
      missingTranslations(
        values({
          title: { pt: 'Meu projeto', en: 'My project' },
          description: { pt: 'Uma descrição.', en: '' },
          content: { pt: '# Conteúdo', en: '   ' },
        }),
      ),
    ).toEqual(['description', 'content']);
  });

  it('reports nothing once all three are translated', () => {
    expect(
      missingTranslations(
        values({
          title: { pt: 'a', en: 'a' },
          description: { pt: 'b', en: 'b' },
          content: { pt: 'c', en: 'c' },
        }),
      ),
    ).toEqual([]);
  });
});

describe('toPayload', () => {
  /**
   * O schema recusa `''` de propósito: omitir a chave significa "ainda não
   * traduzido", e guardar string vazia deixaria o fallback do site público
   * sem saber distinguir um branco deliberado de um campo por traduzir.
   */
  it('omits an empty en instead of sending an empty string', () => {
    const payload = toPayload(values(), 'create');

    expect(payload.title).toEqual({ pt: 'Meu projeto' });
    expect(payload.title).not.toHaveProperty('en');
  });

  it('keeps en when it was filled in', () => {
    const payload = toPayload(
      values({ title: { pt: 'Meu projeto', en: 'My project' } }),
      'create',
    );

    expect(payload.title).toEqual({ pt: 'Meu projeto', en: 'My project' });
  });

  it('trims what was typed', () => {
    const payload = toPayload(
      values({
        title: { pt: '  Meu projeto  ', en: '  My project  ' },
        slug: '  meu-projeto  ',
        techStack: [' NestJS '],
      }),
      'create',
    );

    expect(payload.title).toEqual({ pt: 'Meu projeto', en: 'My project' });
    expect(payload.slug).toBe('meu-projeto');
    expect(payload.techStack).toEqual(['NestJS']);
  });

  it('omits an empty optional field on create, where there is nothing to preserve', () => {
    const payload = toPayload(values(), 'create');

    expect(payload.repoUrl).toBeUndefined();
    expect(payload.demoUrl).toBeUndefined();
    expect(payload.coverImageUrl).toBeUndefined();
    expect(payload.completedAt).toBeUndefined();
  });

  /**
   * Num PATCH, chave ausente significa "não mexe". Omitir um campo esvaziado
   * deixaria o valor antigo no banco, e a tela mostraria uma remoção que não
   * aconteceu.
   */
  it('sends null for a cleared optional field on edit, so clearing actually clears', () => {
    const payload = toPayload(values(), 'edit');

    expect(payload.repoUrl).toBeNull();
    expect(payload.demoUrl).toBeNull();
    expect(payload.coverImageUrl).toBeNull();
    expect(payload.completedAt).toBeNull();
  });

  it('drops blank entries from techStack', () => {
    const payload = toPayload(
      values({ techStack: ['NestJS', '   ', 'Next.js'] }),
      'create',
    );

    expect(payload.techStack).toEqual(['NestJS', 'Next.js']);
  });
});

describe('validateProjectForm', () => {
  it('accepts a complete pt-only project, since en is optional (RF-PROJ1)', () => {
    const result = validateProjectForm(values(), 'create');

    expect(result.ok).toBe(true);
  });

  it('reports the missing pt field on its own path, not as one form-wide error', () => {
    const result = validateProjectForm(
      values({
        title: { pt: '', en: '' },
        description: { pt: '  ', en: '' },
      }),
      'create',
    );

    expect(result).toEqual({
      ok: false,
      errors: { 'title.pt': 'requiredPt', 'description.pt': 'requiredPt' },
    });
  });

  it('rejects a slug that would not survive a URL round trip', () => {
    const result = validateProjectForm(
      values({ slug: 'Meu Projeto!' }),
      'create',
    );

    expect(result).toEqual({ ok: false, errors: { slug: 'invalidSlug' } });
  });

  it('separates an empty slug from a badly formatted one', () => {
    const result = validateProjectForm(values({ slug: '' }), 'create');

    expect(result).toEqual({ ok: false, errors: { slug: 'requiredSlug' } });
  });

  it('rejects a link that is not a full URL', () => {
    const result = validateProjectForm(
      values({ repoUrl: 'github.com/exemplo' }),
      'create',
    );

    expect(result).toEqual({ ok: false, errors: { repoUrl: 'invalidUrl' } });
  });

  it('rejects a malformed completion date', () => {
    const result = validateProjectForm(
      values({ status: 'completed', completedAt: '01/03/2026' }),
      'create',
    );

    expect(result).toEqual({
      ok: false,
      errors: { completedAt: 'invalidDate' },
    });
  });

  /**
   * A regra vive em packages/shared e a API a aplica no service. Conferir
   * aqui troca um 400 do servidor por um erro no próprio campo — que é o que
   * a user story 5 pede.
   */
  it('refuses a completion date on a project that is not completed', () => {
    const result = validateProjectForm(
      values({ status: 'in_progress', completedAt: '2026-03-01' }),
      'create',
    );

    expect(result).toEqual({
      ok: false,
      errors: { completedAt: 'completedAtNeedsCompleted' },
    });
  });

  it('allows a completed project with no date, which is a normal in-between state', () => {
    const result = validateProjectForm(
      values({ status: 'completed', completedAt: '' }),
      'create',
    );

    expect(result.ok).toBe(true);
  });

  it('applies the same rules on edit', () => {
    const result = validateProjectForm(
      values({ title: { pt: '', en: '' } }),
      'edit',
    );

    expect(result).toEqual({ ok: false, errors: { 'title.pt': 'requiredPt' } });
  });

  it('hands back the parsed payload, defaults included, so the caller sends what the API validated', () => {
    const result = validateProjectForm(
      values({ techStack: ['NestJS'], featured: true }),
      'create',
    );

    expect(result).toEqual({
      ok: true,
      mode: 'create',
      payload: {
        title: { pt: 'Meu projeto' },
        description: { pt: 'Uma descrição.' },
        content: { pt: '# Conteúdo' },
        slug: 'meu-projeto',
        techStack: ['NestJS'],
        status: 'in_progress',
        featured: true,
      },
    });
  });

  it('keeps the nulls that clear a field on edit', () => {
    const result = validateProjectForm(
      values({ status: 'in_progress' }),
      'edit',
    );

    expect(result).toEqual({
      ok: true,
      mode: 'edit',
      payload: expect.objectContaining({
        repoUrl: null,
        demoUrl: null,
        coverImageUrl: null,
        completedAt: null,
      }),
    });
  });
});
