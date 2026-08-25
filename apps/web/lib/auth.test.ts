import { login, logout, refreshSession } from './auth';

describe('login', () => {
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
  });

  function mockResponse(init: { ok: boolean; status: number }) {
    global.fetch = jest.fn().mockResolvedValue(init) as unknown as typeof fetch;
  }

  it('posts the credentials to the public API address', async () => {
    mockResponse({ ok: true, status: 200 });

    await login('dono@exemplo.com', 'senha');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'dono@exemplo.com',
          password: 'senha',
        }),
      }),
    );
  });

  /**
   * O CsrfGuard da API rejeita todo método mutante sem este header, inclusive
   * `/auth/login`. Sem ele a resposta é 403 e o sintoma seria "o login sempre
   * falha" com a credencial correta — o tipo de erro que manda quem investiga
   * conferir a senha.
   */
  it('sends the X-Requested-With header the CSRF guard requires', async () => {
    mockResponse({ ok: true, status: 200 });

    await login('dono@exemplo.com', 'senha');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  /**
   * Sem `credentials: 'include'` o browser descarta os cookies `HttpOnly` da
   * resposta: o login retorna 200 e a sessão nunca passa a existir.
   */
  it('sends credentials, without which the cookies would be dropped', async () => {
    mockResponse({ ok: true, status: 200 });

    await login('dono@exemplo.com', 'senha');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.credentials).toBe('include');
  });

  it('reports success without handling any token itself', async () => {
    mockResponse({ ok: true, status: 200 });

    await expect(login('dono@exemplo.com', 'senha')).resolves.toEqual({
      ok: true,
    });
  });

  it.each([401, 403])('maps %s to invalid credentials', async (status) => {
    mockResponse({ ok: false, status });

    await expect(login('dono@exemplo.com', 'errada')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('maps 429 to rate limited, not to a wrong password', async () => {
    mockResponse({ ok: false, status: 429 });

    await expect(login('dono@exemplo.com', 'senha')).resolves.toEqual({
      ok: false,
      reason: 'rateLimited',
    });
  });

  it('maps a network failure to unavailable, not to a wrong password', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('Failed to fetch'),
      ) as unknown as typeof fetch;

    await expect(login('dono@exemplo.com', 'senha')).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('maps a server error to unavailable', async () => {
    mockResponse({ ok: false, status: 500 });

    await expect(login('dono@exemplo.com', 'senha')).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});

describe('logout', () => {
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

  function mockResponse(init: { ok?: boolean; status: number }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.ok ?? init.status < 400,
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

  it('posts to the logout endpoint', async () => {
    mockResponse({ status: 200 });

    await logout();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  /**
   * É o cookie que a API revoga e limpa. Sem `credentials: 'include'` o
   * browser não o manda, e o logout "funciona" sem encerrar sessão nenhuma.
   */
  it('sends the session cookies, which are the whole point of the call', async () => {
    mockResponse({ status: 200 });

    await logout();

    expect(callInit().credentials).toBe('include');
  });

  it('sends the CSRF header the guard requires on every mutating method', async () => {
    mockResponse({ status: 200 });

    await logout();

    expect(callInit().headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  it('sends no body, so it declares no content type', async () => {
    mockResponse({ status: 200 });

    await logout();

    expect(callInit().body).toBeUndefined();
    expect(callInit().headers).not.toHaveProperty('Content-Type');
  });

  it('reports success', async () => {
    mockResponse({ status: 200 });

    await expect(logout()).resolves.toBe(true);
  });

  /**
   * Quem chama sai do painel de qualquer forma. O retorno existe só para a UI
   * poder saber que a revogação do lado do servidor não aconteceu.
   */
  it('reports failure without throwing when the API refuses', async () => {
    mockResponse({ status: 500 });

    await expect(logout()).resolves.toBe(false);
  });

  it('reports failure without throwing when the API is unreachable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;

    await expect(logout()).resolves.toBe(false);
  });
});

describe('refreshSession', () => {
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

  function mockResponse(init: { ok?: boolean; status: number }) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: init.ok ?? init.status < 400,
      ...init,
    }) as unknown as typeof fetch;
  }

  it('posts to the refresh endpoint with the session cookies', async () => {
    mockResponse({ status: 200 });

    await refreshSession();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exemplo.com/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('sends the CSRF header', async () => {
    mockResponse({ status: 200 });

    await refreshSession();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.headers).toMatchObject({
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  it('reports success', async () => {
    mockResponse({ status: 200 });

    await expect(refreshSession()).resolves.toEqual({ ok: true });
  });

  /**
   * Refresh vencido, revogado, ou família derrubada pela detecção de reuso:
   * em todos os casos o caminho é reautenticar, não repetir.
   */
  it.each([401, 403])('reports expired on %i', async (status) => {
    mockResponse({ status });

    await expect(refreshSession()).resolves.toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('separates a server error from an expired session', async () => {
    // repetir faz sentido aqui; reautenticar não
    mockResponse({ status: 500 });

    await expect(refreshSession()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('reports unavailable when the API is unreachable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;

    await expect(refreshSession()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  /**
   * A API rotaciona o refresh token a cada uso e trata a reapresentação de um
   * já rotacionado como vazamento, revogando a família inteira. Duas
   * renovações concorrentes com o mesmo token derrubariam a sessão em vez de
   * renová-la — por isso a chamada em voo é compartilhada.
   */
  it('shares one in-flight call instead of rotating the token twice', async () => {
    let settle: (value: { ok: boolean; status: number }) => void = () => {};
    global.fetch = jest.fn().mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    ) as unknown as typeof fetch;

    const first = refreshSession();
    const second = refreshSession();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    settle({ ok: true, status: 200 });

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
  });

  it('starts a fresh call once the previous one has settled', async () => {
    mockResponse({ status: 200 });

    await refreshSession();
    await refreshSession();

    // compartilhar para sempre significaria nunca mais renovar de verdade
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not leave a failed call stuck as the shared one', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new TypeError('fetch failed'),
      ) as unknown as typeof fetch;
    await refreshSession();

    mockResponse({ status: 200 });
    await expect(refreshSession()).resolves.toEqual({ ok: true });
  });
});
