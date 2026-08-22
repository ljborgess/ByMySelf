import { login } from './auth';

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
