/**
 * O que toda chamada feita **pelo browser** à API precisa saber.
 *
 * Existe como módulo próprio porque o header de CSRF é a regra que mais dói
 * esquecer: sem ele a API responde 403 em qualquer método mutante, e o
 * sintoma ("salvar sempre falha", "login sempre falha") não aponta para a
 * causa. Uma cópia por arquivo de chamada garantiria que a próxima ficasse
 * sem.
 */

/** Porta da API em desenvolvimento, quando nada mais diz onde ela está. */
const DEV_API_PORT = 3100;

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
 * Em produção esta variável está sempre definida, e nada abaixo é usado.
 *
 * Sem ela, o endereço é derivado do host que o browser já está usando, em vez
 * de `localhost` fixo. O `next dev` anuncia dois endereços no boot — o
 * loopback e o IP da máquina na rede — e abrir o site pelo segundo com um
 * `localhost` cravado aqui manda o browser a uma origem diferente da da
 * página. O CORS da API responde `Allow-Origin` da origem que ela conhece, o
 * browser recusa, e o `fetch` estoura antes de sair — o que a tela reporta
 * como "verifique sua conexão" num login perfeitamente correto.
 */
export function publicApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return configured;
  }

  // `window` não existe em render de servidor. Lá o loopback é o certo: o
  // processo do Next e o da API dividem a máquina.
  if (typeof window === 'undefined') {
    return `http://localhost:${DEV_API_PORT}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${DEV_API_PORT}`;
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
