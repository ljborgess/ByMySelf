/**
 * De onde sai a origem da API que entra no `connect-src` da CSP.
 *
 * Vive fora do next.config.ts para poder ser testado. A regra aqui já custou
 * uma sessão inteira de depuração: sem `NEXT_PUBLIC_API_URL`, a CSP saía com
 * `connect-src 'self'` e o browser bloqueava todo fetch para a API — antes de
 * virar requisição, então nada aparecia no log do servidor. O formulário de
 * login respondia "não foi possível entrar" para toda credencial correta, e
 * nenhuma das partes envolvidas dizia o porquê.
 */

/**
 * Só a *origem* entra na diretiva: `connect-src` ignora caminho, e mandar a
 * URL inteira alargaria a política sem precisão.
 *
 * `undefined` para ausente **e** para malformado. Uma URL com erro de
 * digitação falha exatamente como a variável faltando — a CSP fica sem a
 * origem — e tratar as duas igual é o que faz `assertApiUrlConfigured` pegar
 * as duas.
 *
 * Só http e https passam, e não basta o `new URL` não lançar: `htp:/typo`
 * é uma URL válida para o parser (esquema desconhecido, mas bem formado) e
 * devolve a *string* `'null'` como origem. Truthy, então escaparia de
 * qualquer checagem por ausência — e a CSP sairia com
 * `connect-src 'self' null`, que não libera nada e ainda parece
 * configurado.
 */
const USABLE_PROTOCOLS = new Set(['http:', 'https:']);

export function apiOrigin(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  return USABLE_PROTOCOLS.has(url.protocol) ? url.origin : undefined;
}

/**
 * Interrompe o `next dev` quando a API não tem endereço utilizável.
 *
 * Falha alto de propósito, em vez de assumir um localhost: um default faria a
 * aplicação subir, renderizar e falhar só no primeiro login — que é
 * precisamente o modo de falha que este guard existe para acabar. Parar no
 * boot custa trinta segundos; descobrir pelo navegador custou horas.
 *
 * Só em desenvolvimento. Produção já é coberta pelo Dockerfile, que recusa o
 * build sem a variável (a diferença importa: lá ela é *inlinada* no bundle e
 * não dá para corrigir depois). E o `next build` do CI roda sem ela de
 * propósito — é uma checagem de compilação cujo artefato nunca é servido a um
 * browser, então uma CSP sem a origem da API não afeta nada.
 */
export function assertApiUrlConfigured(
  raw: string | undefined,
  nodeEnv: string | undefined,
): void {
  if (nodeEnv !== 'development' || apiOrigin(raw)) {
    return;
  }

  const problem = raw
    ? `NEXT_PUBLIC_API_URL não é uma URL válida: ${JSON.stringify(raw)}`
    : 'NEXT_PUBLIC_API_URL não está definida';

  throw new Error(
    [
      problem,
      '',
      "Sem ela a CSP deste site sai com `connect-src 'self'`, e o browser",
      'bloqueia toda chamada à API antes de ela virar requisição. O login',
      'falha com "não foi possível entrar" para qualquer credencial, e nada',
      'no log do servidor registra a tentativa.',
      '',
      'Corrija copiando o modelo na raiz do repositório:',
      '',
      '    cp .env.example .env',
      '',
      'ou acrescentando a linha ao .env que já existe:',
      '',
      '    NEXT_PUBLIC_API_URL=http://localhost:3100',
    ].join('\n'),
  );
}
