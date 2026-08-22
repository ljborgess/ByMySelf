/**
 * Endereço público da API, para chamadas feitas **pelo browser**.
 *
 * Não é o `API_URL` que lib/projects.ts usa: aquele é o endereço interno da
 * rede do compose (`http://api:3100`), que o navegador de um visitante não
 * tem como resolver. Chamada de browser precisa do domínio público.
 *
 * `NEXT_PUBLIC_` porque o Next só expõe ao bundle do cliente variáveis com
 * esse prefixo, e o valor entra no JavaScript entregue — então não é lugar
 * para segredo. Aqui é o endereço de um servidor público, o que é adequado.
 */
function publicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';
}

/**
 * Exigido pelo CsrfGuard da API em todo método mutante, junto do
 * `SameSite=Strict` dos cookies (ver README). Sem o header a resposta é 403,
 * e o sintoma seria "login sempre falha" com credencial correta.
 */
const CSRF_HEADER = { 'X-Requested-With': 'XMLHttpRequest' } as const;

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
      headers: { 'Content-Type': 'application/json', ...CSRF_HEADER },
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
