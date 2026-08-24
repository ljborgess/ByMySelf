import { cookies } from 'next/headers';
import { getAdminProject, getAdminProjects } from './admin-projects';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function withCookie(value: string | undefined) {
  mockCookies.mockResolvedValue({
    get: () =>
      value === undefined ? undefined : { name: 'access_token', value },
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe('getAdminProjects', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;

  beforeEach(() => {
    process.env.API_URL = 'https://api.exemplo.com';
    withCookie('token-de-sessao');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
    jest.resetAllMocks();
  });

  function mockFetch(init: {
    ok: boolean;
    status: number;
    json?: () => Promise<unknown>;
  }) {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
      ...init,
    }) as unknown as typeof fetch;
  }

  it('calls the admin listing endpoint', async () => {
    mockFetch({ ok: true, status: 200 });

    await getAdminProjects();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/admin/projects',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  /**
   * O cookie é `HttpOnly`, então quem o tem é a requisição que chegou no Next
   * — não o `fetch` que sai daqui. Sem repassar à mão, a API responde 401 e o
   * painel pareceria sempre deslogado mesmo com sessão válida.
   */
  it('forwards the session cookie, without which the API answers 401', async () => {
    mockFetch({ ok: true, status: 200 });

    await getAdminProjects();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.headers).toMatchObject({
      Cookie: 'access_token=token-de-sessao',
    });
  });

  /**
   * Não pede `includeDeleted`, e é isso que faz remover parecer remover
   * (user story 5). Restaurar um soft-deleted é a #26.
   */
  it('does not ask for soft-deleted projects', async () => {
    mockFetch({ ok: true, status: 200 });

    await getAdminProjects();

    const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).not.toContain('includeDeleted');
  });

  it('returns the parsed list on success', async () => {
    const projects = [{ id: 'a', slug: 'projeto' }];
    mockFetch({ ok: true, status: 200, json: () => Promise.resolve(projects) });

    await expect(getAdminProjects()).resolves.toEqual({
      ok: true,
      projects,
    });
  });

  it('reports unauthenticated when there is no session cookie, without calling the API', async () => {
    withCookie(undefined);
    mockFetch({ ok: true, status: 200 });

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
    // gastar uma chamada que só pode dar 401 não ajuda ninguém
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reports unauthenticated on 401, which is a different outcome from a failure', async () => {
    mockFetch({ ok: false, status: 401 });

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  /**
   * Um 500 não é sessão expirada. Tratar os dois igual jogaria alguém com
   * sessão perfeitamente válida para a tela de login porque o backend piscou.
   */
  it('reports failed on a server error, not unauthenticated', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('reports failed when the API is unreachable', async () => {
    withCookie('token-de-sessao');
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('getAdminProjects — corpo inesperado num 200', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.API_URL = 'https://api.exemplo.com';
    withCookie('token-de-sessao');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  /**
   * Sem tratar isto, o `json()` rejeitaria direto de um async Server
   * Component — e não existe `error.tsx` em nenhum ponto da app, então a
   * pessoa veria a tela genérica do Next em vez do estado de erro que a
   * tabela sabe renderizar.
   */
  it('treats a 200 whose body is not JSON as a failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    }) as unknown as typeof fetch;

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('treats a 200 whose body is not an array as a failure', async () => {
    // um objeto aqui chegaria em `projects.map` e quebraria a renderização
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ erro: 'inesperado' }),
    }) as unknown as typeof fetch;

    await expect(getAdminProjects()).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('getAdminProject', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.API_URL;

  const id = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    process.env.API_URL = 'https://api.exemplo.com';
    withCookie('token-de-sessao');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
    jest.resetAllMocks();
  });

  function mockFetch(init: {
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

  it('reads the project by id, forwarding the session cookie', async () => {
    mockFetch({ status: 200, json: async () => ({ id }) });

    await getAdminProject(id);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.exemplo.com/admin/projects/${id}`,
      expect.objectContaining({
        cache: 'no-store',
        headers: { Cookie: 'access_token=token-de-sessao' },
      }),
    );
  });

  it('returns the project on success', async () => {
    const project = { id, slug: 'projeto' };
    mockFetch({ status: 200, json: async () => project });

    await expect(getAdminProject(id)).resolves.toEqual({ ok: true, project });
  });

  it('reports unauthenticated without spending a call when there is no cookie', async () => {
    withCookie(undefined);
    mockFetch({ status: 200 });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reports unauthenticated on 401, which sends the page to the login', async () => {
    mockFetch({ status: 401 });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'unauthenticated',
    });
  });

  it('reports notFound on 404, which is a 404 page and not an error state', async () => {
    mockFetch({ status: 404 });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });

  /**
   * A rota valida o id com ParseUUIDPipe, então um segmento que não é UUID
   * volta 400 — e para quem digitou a URL isso é indistinguível de um projeto
   * que não existe.
   */
  it('treats a malformed id the same as one that does not exist', async () => {
    mockFetch({ status: 400 });

    await expect(getAdminProject('nao-e-uuid')).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });

  /**
   * Um 500 não é projeto inexistente. Tratar os dois igual mostraria "projeto
   * não encontrado" toda vez que o backend piscasse.
   */
  it('reports failed on a server error, not notFound', async () => {
    mockFetch({ status: 500 });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('reports failed when the API is unreachable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('treats a 200 whose body is not JSON as a failure', async () => {
    mockFetch({
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  /**
   * Um array ou `null` num 200 chegaria no formulário como projeto sem campos
   * — e salvar por cima apagaria o que existe.
   */
  it('treats a 200 whose body is not an object as a failure', async () => {
    mockFetch({ status: 200, json: async () => [] });

    await expect(getAdminProject(id)).resolves.toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});
