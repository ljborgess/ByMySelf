/**
 * Enquadramento do painel.
 *
 * Sem header nem footer do portfólio — esses vivem no route group `(site)`
 * desde a #23, justamente para o painel não herdá-los.
 *
 * Deliberadamente um `div` e não um `main`: cada página do painel declara o
 * seu próprio. Um `main` aqui aninharia dentro do que a tela de login já tem,
 * o que é HTML inválido (dois landmarks `main`) e, pior, quebraria a
 * centralização vertical dela — o `flex-1 justify-center` do login depende de
 * ser filho direto de um container em coluna.
 *
 * Largura também fica por página: a tabela de projetos quer espaço, o
 * formulário de login quer o oposto.
 *
 * Navegação entre seções do painel não existe ainda porque há uma seção só.
 * Quando houver mais, é aqui que entra.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
