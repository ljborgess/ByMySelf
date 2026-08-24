/**
 * O que toda chamada feita **pelo browser** à API precisa saber.
 *
 * Existe como módulo próprio porque o header de CSRF é a regra que mais dói
 * esquecer: sem ele a API responde 403 em qualquer método mutante, e o
 * sintoma ("salvar sempre falha", "login sempre falha") não aponta para a
 * causa. Uma cópia por arquivo de chamada garantiria que a próxima ficasse
 * sem.
 */

/**
 * Endereço público da API.
 *
 * Não é o `API_URL` que lib/projects.ts usa: aquele é o endereço interno da
 * rede do compose (`http://api:3100`), que o navegador de um visitante não
 * tem como resolver. Chamada de browser precisa do domínio público.
 *
 * `NEXT_PUBLIC_` porque o Next só expõe ao bundle do cliente variáveis com
 * esse prefixo, e o valor entra no JavaScript entregue — então não é lugar
 * para segredo. Aqui é o endereço de um servidor público, o que é adequado.
 */
export function publicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';
}

/**
 * Exigido pelo CsrfGuard da API em todo método mutante, junto do
 * `SameSite=Strict` dos cookies (ver README). Sem o header a resposta é 403.
 */
export const CSRF_HEADER = { 'X-Requested-With': 'XMLHttpRequest' } as const;

/**
 * Headers de um corpo JSON mutante: tipo de conteúdo mais o header de CSRF.
 */
export const JSON_MUTATION_HEADERS = {
  'Content-Type': 'application/json',
  ...CSRF_HEADER,
} as const;
