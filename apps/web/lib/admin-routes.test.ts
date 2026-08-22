import {
  ACCESS_TOKEN_COOKIE,
  isProtectedAdminPath,
  loginPathForRequest,
} from './admin-routes';

describe('ACCESS_TOKEN_COOKIE', () => {
  /**
   * O valor é duplicado de apps/api/src/auth/auth.constants.ts porque
   * apps/web não depende de apps/api. Este teste é o que transforma uma
   * renomeação no backend numa falha visível: sem ele, o proxy passaria a
   * nunca achar o cookie e todo acesso ao painel viraria um redirect
   * silencioso para o login, com a sessão válida.
   */
  it('matches the cookie name the API sets', () => {
    expect(ACCESS_TOKEN_COOKIE).toBe('access_token');
  });
});

describe('isProtectedAdminPath', () => {
  it.each([
    '/pt/admin',
    '/pt/admin/',
    '/pt/admin/projetos',
    '/pt/admin/projetos/novo',
    '/admin',
    '/admin/projetos',
  ])('protects %s', (pathname) => {
    expect(isProtectedAdminPath(pathname)).toBe(true);
  });

  it.each(['/pt/admin/login', '/admin/login'])(
    'leaves %s reachable',
    (pathname) => {
      // Proteger o próprio login faria o redirect apontar para uma rota que
      // também redireciona, e o browser cortaria com ERR_TOO_MANY_REDIRECTS
      // em vez de mostrar o formulário.
      expect(isProtectedAdminPath(pathname)).toBe(false);
    },
  );

  it.each([
    '/',
    '/pt',
    '/pt/projetos',
    '/pt/sobre',
    '/robots.txt',
    // não é o segmento `admin`, só começa igual
    '/pt/administracao',
  ])('does not touch the public route %s', (pathname) => {
    expect(isProtectedAdminPath(pathname)).toBe(false);
  });
});

describe('loginPathForRequest', () => {
  it('keeps the locale the visitor was already on', () => {
    expect(loginPathForRequest('/pt/admin/projetos')).toBe('/pt/admin/login');
  });

  it('falls back to the default locale when the path carries none', () => {
    expect(loginPathForRequest('/admin/projetos')).toBe('/pt/admin/login');
  });
});

describe('isProtectedAdminPath — evasão por codificação', () => {
  /**
   * O roteador do Next decodifica o caminho, então estas formas chegam à
   * mesma página que `/pt/admin/...`. Comparar o segmento cru contra 'admin'
   * deixaria o guard passar batido e o painel ficaria alcançável sem cookie —
   * exatamente o que a user story 4 proíbe.
   */
  it.each([
    ['percent-encoded', '/pt/%61dmin/projetos'],
    ['maiúsculas', '/pt/ADMIN/projetos'],
    ['maiúsculas sem locale', '/Admin/projetos'],
  ])('still protects %s', (_label, pathname) => {
    expect(isProtectedAdminPath(pathname)).toBe(true);
  });

  it('keeps the login exempt even percent-encoded', () => {
    // se isto virasse `true`, o redirect apontaria para uma rota protegida e
    // o browser cortaria com ERR_TOO_MANY_REDIRECTS
    expect(isProtectedAdminPath('/pt/admin/%6cogin')).toBe(false);
  });
});
