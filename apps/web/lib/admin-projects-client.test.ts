import {
  createProject,
  deleteProject,
  reorderProject,
  updateProject,
} from './admin-projects-client';

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

describe('deleteProject', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  const id = '11111111-1111-4111-8111-111111111111';

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

  it('deletes the project it was given', async () => {
    mockResponse({ status: 204 });

    await deleteProject(id);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.exemplo.com/admin/projects/${id}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  /**
   * O CsrfGuard da API recusa todo método mutante sem este header, DELETE
   * incluído. Sem ele a resposta é 403 e o sintoma seria "excluir nunca
   * funciona".
   */
  it('sends the X-Requested-With header the CSRF guard requires', async () => {
    mockResponse({ status: 204 });

    await deleteProject(id);

    expect(callInit().headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  /** Sem corpo, então sem `Content-Type` a declarar. */
  it('sends no content type, because it sends no body', async () => {
    mockResponse({ status: 204 });

    await deleteProject(id);

    expect(callInit().body).toBeUndefined();
    expect(callInit().headers).not.toHaveProperty('Content-Type');
  });

  it('sends the session cookies', async () => {
    mockResponse({ status: 204 });

    await deleteProject(id);

    expect(callInit().credentials).toBe('include');
  });

  it('reports success on the 204 the endpoint answers with', async () => {
    mockResponse({ status: 204 });

    await expect(deleteProject(id)).resolves.toEqual({ ok: true });
  });

  it('reports an expired session separately, so the caller can go to the login', async () => {
    mockResponse({ status: 401 });

    await expect(deleteProject(id)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  /**
   * Desfecho próprio porque a tabela o trata como sucesso: significa que a
   * listagem estava velha e o projeto já não existe.
   */
  it('reports notFound on 404', async () => {
    mockResponse({ status: 404 });

    await expect(deleteProject(id)).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });

  it('treats a malformed id the same as one that does not exist', async () => {
    // a rota valida o id com ParseUUIDPipe, então um id malformado nunca
    // correspondeu a projeto nenhum
    mockResponse({ status: 400 });

    await expect(deleteProject('nao-e-uuid')).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });

  it('reports a server error as unavailable', async () => {
    mockResponse({ status: 500 });

    await expect(deleteProject(id)).resolves.toEqual({
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

    await expect(deleteProject(id)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});

describe('reorderProject', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  const id = '11111111-1111-4111-8111-111111111111';

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
      json: () => Promise.resolve([]),
      ...init,
    }) as unknown as typeof fetch;
  }

  it('patches the order endpoint of the project being moved', async () => {
    mockResponse({ status: 200 });

    await reorderProject(id, 2);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.exemplo.com/admin/projects/${id}/order`,
      expect.objectContaining({
        method: 'PATCH',
        // `order` é a posição de destino na listagem, zero-based -- não um
        // valor da coluna `order`
        body: JSON.stringify({ order: 2 }),
      }),
    );
  });

  it('sends the CSRF header and the session cookies', async () => {
    mockResponse({ status: 200 });

    await reorderProject(id, 0);

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  /**
   * Mover um projeto desloca os outros, então a resposta é a listagem
   * inteira -- a posição nova de um só não diria onde os demais foram parar.
   */
  it('hands back the whole reordered listing the API answers with', async () => {
    const listing = [{ id: 'b' }, { id: 'a' }];
    mockResponse({ status: 200, json: async () => listing });

    await expect(reorderProject(id, 0)).resolves.toEqual({
      ok: true,
      projects: listing,
    });
  });

  /**
   * A escrita aconteceu; chamar de falha faria a pessoa clicar de novo e
   * mover o projeto duas casas.
   */
  it('still reports success when the 200 body is not JSON', async () => {
    mockResponse({
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await expect(reorderProject(id, 0)).resolves.toEqual({ ok: true });
  });

  it('still reports success when the 200 body is not a listing', async () => {
    mockResponse({ status: 200, json: async () => ({ erro: 'inesperado' }) });

    await expect(reorderProject(id, 0)).resolves.toEqual({ ok: true });
  });

  it('reports an expired session separately', async () => {
    mockResponse({ status: 401 });

    await expect(reorderProject(id, 0)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  it('reports notFound on 404', async () => {
    mockResponse({ status: 404 });

    await expect(reorderProject(id, 0)).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });

  it('reports a server error as unavailable', async () => {
    mockResponse({ status: 500 });

    await expect(reorderProject(id, 0)).resolves.toEqual({
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

    await expect(reorderProject(id, 0)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});

describe('renovação de sessão no meio de uma escrita', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  const id = '11111111-1111-4111-8111-111111111111';

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

  function respond(init: {
    ok?: boolean;
    status: number;
    json?: () => Promise<unknown>;
  }) {
    return {
      ok: init.ok ?? init.status < 400,
      json: () => Promise.resolve({}),
      ...init,
    };
  }

  /** Requisições em sequência, para encenar 401 → refresh → repetição. */
  function mockSequence(...responses: ReturnType<typeof respond>[]) {
    const fn = jest.fn();
    for (const response of responses) {
      fn.mockResolvedValueOnce(response);
    }
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  function calledUrls(): string[] {
    return (global.fetch as jest.Mock).mock.calls.map(
      (call) => call[0] as string,
    );
  }

  /**
   * O access token dura 15 minutos e o refresh 30 dias, então expirar no meio
   * do trabalho é o caso comum. Mandar a pessoa para o login aqui perderia o
   * que ela estava salvando.
   */
  it('renews and retries a save that hit an expired access token', async () => {
    mockSequence(
      respond({ status: 401 }),
      respond({ status: 200 }),
      respond({ status: 201 }),
    );

    await expect(createProject(input)).resolves.toEqual({ ok: true });

    expect(calledUrls()).toEqual([
      'https://api.exemplo.com/admin/projects',
      'https://api.exemplo.com/auth/refresh',
      'https://api.exemplo.com/admin/projects',
    ]);
  });

  it('renews and retries a delete', async () => {
    mockSequence(
      respond({ status: 401 }),
      respond({ status: 200 }),
      respond({ status: 204 }),
    );

    await expect(deleteProject(id)).resolves.toEqual({ ok: true });
    expect(calledUrls()).toHaveLength(3);
  });

  it('renews and retries a reorder', async () => {
    mockSequence(
      respond({ status: 401 }),
      respond({ status: 200 }),
      respond({ status: 200, json: async () => [] }),
    );

    await expect(reorderProject(id, 1)).resolves.toEqual({
      ok: true,
      projects: [],
    });
    expect(calledUrls()).toHaveLength(3);
  });

  it('gives up after one retry instead of looping', async () => {
    mockSequence(
      respond({ status: 401 }),
      respond({ status: 200 }),
      respond({ status: 401 }),
    );

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
    // um segundo 401 depois de renovar significa que não há sessão a
    // recuperar; insistir viraria laço
    expect(calledUrls()).toHaveLength(3);
  });

  it('does not retry when there is no session left to renew', async () => {
    mockSequence(respond({ status: 401 }), respond({ status: 401 }));

    await expect(createProject(input)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
    // a escrita, a renovação recusada, e nada mais
    expect(calledUrls()).toEqual([
      'https://api.exemplo.com/admin/projects',
      'https://api.exemplo.com/auth/refresh',
    ]);
  });

  it('does not renew for a refusal that is not about the session', async () => {
    mockSequence(respond({ status: 409, json: async () => ({}) }));

    await createProject(input);

    // 409 é slug em uso: renovar não muda nada e gastaria uma rotação de
    // token à toa
    expect(calledUrls()).toEqual(['https://api.exemplo.com/admin/projects']);
  });
});
