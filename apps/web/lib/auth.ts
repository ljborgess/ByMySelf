import { CSRF_HEADER, JSON_MUTATION_HEADERS, publicApiUrl } from './api-client';

export type LoginResult =
  | { ok: true }
  /**
   * `invalid` cobre 401 e 403 de propósito: a API não revela qual campo
   * estava errado (não-divulgação intencional), e a UI não deve inventar
   * essa distinção.
   */
  | { ok: false; reason: 'invalid' | 'rateLimited' | 'unavailable' };

/**
 * RF-AUT1. Autentica e deixa os cookies para o browser.
 *
 * Nenhum token é lido, guardado ou tocado aqui: a resposta de sucesso é
 * `{ status: 'ok' }` e os tokens vêm em cookies `HttpOnly`, invisíveis ao
 * JavaScript (user story 5). `credentials: 'include'` é o que faz o browser
 * aceitar e depois reenviar esses cookies — sem isso o login "funciona" e a
 * sessão não existe.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(`${publicApiUrl()}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      // Sem o header de CSRF a resposta é 403, e o sintoma seria "login
      // sempre falha" com credencial correta.
      headers: JSON_MUTATION_HEADERS,
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // Rede fora, DNS, CORS bloqueado: nada disso é credencial errada, e
    // dizer "credenciais inválidas" mandaria a pessoa conferir a senha em vez
    // da conexão.
    return { ok: false, reason: 'unavailable' };
  }

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 429) {
    // A API limita login por IP (RNF-SEG5) e ainda tem backoff por conta;
    // tratar isso como senha errada convidaria a pessoa a tentar de novo,
    // que é exatamente o que piora a situação dela.
    return { ok: false, reason: 'rateLimited' };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: false, reason: 'unavailable' };
}

/**
 * RF-AUT1. Encerra a sessão.
 *
 * A API revoga o refresh token e limpa os dois cookies pelo `Set-Cookie` da
 * resposta; aqui não há token para apagar, porque nunca houve token em
 * JavaScript nenhum. `credentials: 'include'` é o que faz o browser mandar o
 * cookie a revogar e depois aceitar a limpeza.
 *
 * Devolve `false` só para a UI poder dizer que a revogação do lado do
 * servidor não aconteceu. Quem chama deve sair da tela do painel de qualquer
 * forma: continuar num painel de uma sessão que a pessoa mandou encerrar é
 * pior que sair sem confirmação.
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch(`${publicApiUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      // Sem corpo, então sem `Content-Type` — só o header que o CsrfGuard
      // exige de todo método mutante.
      headers: CSRF_HEADER,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type RefreshResult =
  | { ok: true }
  /**
   * `expired` é o desfecho normal: o refresh token acabou, foi revogado, ou
   * a detecção de reuso derrubou a família inteira. Em todos os casos o
   * caminho é reautenticar, não repetir.
   *
   * `unavailable` é rede ou 5xx — repetir aqui faz sentido, reautenticar
   * não.
   */
  | { ok: false; reason: 'expired' | 'unavailable' };

/**
 * Uma renovação em voo por vez, compartilhada por todo mundo que pedir
 * enquanto ela não termina.
 *
 * Isto não é otimização: a API rotaciona o refresh token a cada uso e trata
 * a reapresentação de um token já rotacionado como vazamento, revogando a
 * família inteira. Duas renovações concorrentes com o mesmo token — duas
 * chamadas do painel disparando juntas, por exemplo — derrubariam a sessão
 * em vez de renová-la. Compartilhar a promessa é o que impede isso.
 *
 * Entre abas o problema não se coloca: cookie é do browser, não da aba, e a
 * aba que renovar primeiro já deixa o token novo válido para as outras.
 */
let inFlight: Promise<RefreshResult> | null = null;

/**
 * RF-AUT1. Troca o refresh token por um par novo de cookies.
 *
 * O access token dura 15 minutos e o refresh 30 dias: sem isto, o painel
 * expulsaria a cada quinze minutos mesmo com sessão válida por semanas.
 */
export function refreshSession(): Promise<RefreshResult> {
  inFlight ??= sendRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function sendRefresh(): Promise<RefreshResult> {
  let response: Response;

  try {
    response = await fetch(`${publicApiUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: CSRF_HEADER,
    });
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  if (response.ok) {
    return { ok: true };
  }

  // 401 e 403 são o mesmo desfecho: não há mais sessão a recuperar.
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: false, reason: 'unavailable' };
}
