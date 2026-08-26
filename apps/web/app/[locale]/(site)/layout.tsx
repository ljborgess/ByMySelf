import { ScrollProgress } from '../../../components/scroll-progress';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';

/**
 * O chrome do site público — header, área de conteúdo e footer.
 *
 * Vive num route group `(site)` em vez de no layout raiz porque o painel
 * admin (#23) compartilha locale, fontes e provider de i18n, mas não deve
 * herdar a navegação pública: uma tela de login com o menu do portfólio em
 * cima anuncia as rotas do site para quem está tentando entrar, e confunde
 * quem já é o dono.
 *
 * Parênteses no nome da pasta = não entra na URL. Nenhuma rota mudou de
 * endereço com essa reorganização.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <ScrollProgress />
      {/*
        flex-1 so a short page still pushes the footer to the bottom.
        pt-[--header-offset] clears the floating header, which is `fixed`
        and therefore out of flow -- without it the first line of every
        page renders underneath the bar.
      */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-[var(--header-offset)] pb-8 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
