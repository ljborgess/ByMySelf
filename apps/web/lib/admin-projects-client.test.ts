import { createProject, updateProject } from './admin-projects-client';

const input = {
  title: { pt: 'Meu projeto' },
  description: { pt: 'Uma descrição.' },
  content: { pt: '# Conteúdo' },
  slug: 'meu-projeto',
  techStack: ['NestJS'],
  status: 'in_progress' as const,
  featured: false,
};

describe('admin project writes', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.exemplo.com';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    jest.resetAllMocks();
  });

  function mockResponse(init: {
    ok?: boolean;
    status: number;
    json?: () => Promise<unknown>;
  }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.ok ?? init.status < 400,
      json: () => Promise.resolve({}),
      ...init,
    }) as unknown as typeof fetch;
  }

  function callInit(): RequestInit {
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    return init;
  }

  it('posts a create to the admin endpoint at the public API address', async () => {
    mockResponse({ status: 201 });

    await createProject(input);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/admin/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }),
    );
  });

  it('patches an edit to the project it is editing', async () => {
    mockResponse({ status: 200 });

    await updateProject('11111111-1111-4111-8111-111111111111', {
      slug: 'outro-slug',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/admin/projects/11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ slug: 'outro-slug' }),
      }),
    );
  });

  /**
   * O CsrfGuard da API recusa todo método mutante sem este header. Sem ele a
   * resposta é 403 e o sintoma seria "salvar sempre falha" com dados válidos.
   */
  it('sends the X-Requested-With header the CSRF guard requires', async () => {
    mockResponse({ status: 201 });

    await createProject(input);

    expect(callInit().headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  /**
   * Os cookies de sessão são `HttpOnly`; sem `credentials: 'include'` o
   * browser não os manda e toda escrita responderia 401 mesmo logado.
   */
  it('sends the session cookies', async () => {
    mockResponse({ status: 201 });

    await createProject(input);

    expect(callInit().credentials).toBe('include');
  });

  it('reports success without reading the response body', async () => {
    const json = jest.fn();
    mockResponse({ status: 201, json });

    await expect(createProject(input)).resolves.toEqual({ ok: true });
    // Interpretar o corpo só criaria uma falha nova: um 201 ilegível viraria
    // "não deu para salvar" depois de a escrita já ter acontecido.
    expect(json).not.toHaveBeenCalled();
  });

  it('reports an expired session separately, so the caller can go to the login', async () => {
    mockResponse({ status: 401 });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  /**
   * A API diz qual projeto está segurando o slug, e se ele foi excluído.
   * Trocar isso por um texto fixo esconderia justamente o que resolve.
   */
  it('surfaces the API message on a slug conflict', async () => {
    mockResponse({
      status: 409,
      json: async () => ({
        statusCode: 409,
        message: 'O slug "meu-projeto" já está em uso.',
      }),
    });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'conflict',
      message: 'O slug "meu-projeto" já está em uso.',
    });
  });

  it('maps a Zod rejection from the API back onto the fields that caused it', async () => {
    mockResponse({
      status: 400,
      json: async () => ({
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          { path: ['title', 'pt'], message: 'Obrigatório em português' },
          { path: ['slug'], message: 'Formato inválido' },
        ],
      }),
    });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      // `'Validation failed'` é o texto fixo do pipe, não diagnóstico: deixá-lo
      // passar mostraria inglês genérico onde já existe mensagem por campo
      message: undefined,
      fieldErrors: {
        'title.pt': 'Obrigatório em português',
        slug: 'Formato inválido',
      },
    });
  });

  it('keeps the message of a rejection the service raised itself', async () => {
    mockResponse({
      status: 400,
      json: async () => ({
        statusCode: 400,
        message: 'completedAt só se aplica a um projeto com status "completed"',
      }),
    });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      message: 'completedAt só se aplica a um projeto com status "completed"',
      fieldErrors: undefined,
    });
  });

  it('reports a server error as unavailable, which is not something to fix in the form', async () => {
    mockResponse({ status: 500 });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('reports the API being unreachable as unavailable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('survives a refusal whose body is not JSON', async () => {
    mockResponse({
      status: 409,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'conflict',
      message: '',
    });
  });
});
