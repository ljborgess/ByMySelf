import { routing } from '../i18n/routing';

/**
 * Precisa bater com `ACCESS_TOKEN_COOKIE` em apps/api/src/auth/auth.constants.ts.
 *
 * Duplicado e não importado: `apps/web` não depende de `apps/api`, e criar
 * essa dependência só por uma string arrastaria a árvore inteira do NestJS
 * para o bundle do site. O teste em admin-routes.test.ts fixa o valor, então
 * uma renomeação no backend quebra aqui em vez de virar um redirect
 * silencioso para o login.
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Idem para `REFRESH_TOKEN_COOKIE` em apps/api/src/auth/auth.constants.ts.
 *
 * O painel precisa saber que ele existe — não ler o valor, que é `HttpOnly`.
 * A presença é o que distingue "não há sessão" de "o access token venceu e a
 * sessão ainda pode ser recuperada", e são desfechos diferentes: um manda
 * para o login, o outro renova em silêncio.
 */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Segmento do painel, logo abaixo do prefixo de locale. */
const ADMIN_SEGMENT = 'admin';

/** A única rota de `/admin` que um visitante anônimo pode alcançar. */
const LOGIN_SEGMENT = 'login';

function localePrefixOf(pathname: string): string {
  const [, maybeLocale] = pathname.split('/');
  return (routing.locales as readonly string[]).includes(maybeLocale)
    ? maybeLocale
    : routing.defaultLocale;
}

/**
 * `true` para qualquer rota de `/admin` que exija sessão — ou seja, todas
 * menos a própria tela de login.
 *
 * Deixar o login de fora não é exceção cosmética: sem isso o redirect
 * aponta para uma rota que também redireciona, e o browser corta o loop com
 * ERR_TOO_MANY_REDIRECTS em vez de mostrar o formulário.
 */
export function isProtectedAdminPath(pathname: string): boolean {
  const segments = pathname
    .split('/')
    .filter(Boolean)
    // Decodifica e normaliza antes de comparar. `/pt/%61dmin/projetos` é o
    // mesmo caminho que `/pt/admin/projetos` para o roteador, mas a
    // comparação literal contra 'admin' não casaria — e o guard deixaria
    // passar sem checar o cookie. `decodeURIComponent` pode lançar em
    // sequência inválida, e nesse caso o segmento cru já não casa mesmo.
    .map((segment) => {
      try {
        return decodeURIComponent(segment).toLowerCase();
      } catch {
        return segment.toLowerCase();
      }
    });

  const [first, second, third] = segments;

  const isLocalePrefixed = (routing.locales as readonly string[]).includes(
    first,
  );
  const adminIndex = isLocalePrefixed ? second : first;
  if (adminIndex !== ADMIN_SEGMENT) {
    return false;
  }

  const routeSegment = isLocalePrefixed ? third : second;
  return routeSegment !== LOGIN_SEGMENT;
}

/**
 * Caminho do login preservando o locale que a pessoa estava usando — mandar
 * quem está em `/pt/admin` para um login sem locale faria o próximo redirect
 * escolher o idioma de novo, e a URL piscaria duas vezes.
 */
export function loginPathForRequest(pathname: string): string {
  return `/${localePrefixOf(pathname)}/${ADMIN_SEGMENT}/${LOGIN_SEGMENT}`;
}
