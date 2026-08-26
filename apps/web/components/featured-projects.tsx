import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import type { PublicProjectListItem } from '../lib/projects';

/**
 * Prévia de projetos em destaque na home (docs/design-clone-syahril.md).
 * A home hoje só linka para /projetos (SectionCards) sem mostrar projeto
 * nenhum -- esta seção é a primeira prova social visível sem sair da home.
 *
 * Recebe a lista já filtrada por `featured`, não filtra sozinha: quem chama
 * (page.tsx) já decide o que "falhou ao carregar" significa aqui (nada --
 * ver o comentário lá), então este componente só sabe renderizar o que
 * recebeu.
 *
 * Grid simples, não o mosaico assimétrico de /projetos (#132): a referência
 * não tem prévia de projeto nenhuma na home, só o link da seção "Journal" --
 * o mosaico é decisão de design específica dessa seção própria, não algo pra
 * replicar num resumo curto. Sem 'use client': não sobrou função nenhuma
 * cruzando pra um Client Component depois que o Carousel saiu.
 */
export function FeaturedProjects({
  projects,
}: {
  projects: PublicProjectListItem[];
}) {
  const t = useTranslations('home');

  // Seção vazia não aparece -- mesmo princípio que about/page.tsx já usa
  // pra bio/objetivo: uma seção sem conteúdo real parece quebrada, ausente
  // não.
  if (projects.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t('featuredHeading')}
      </h2>

      <ul
        aria-label={t('featuredHeading')}
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projetos/${project.slug}`}
              className="hover:border-accent focus-visible:border-accent group flex h-full flex-col rounded-lg border border-white/15 p-5 transition-colors"
            >
              {project.coverImageUrl && (
                // plain <img>, not next/image -- same reasoning as
                // projects-list.tsx: photoUrl/coverImageUrl is an arbitrary
                // external URL the owner pastes in
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.coverImageUrl}
                  alt={project.title}
                  loading="lazy"
                  className="mb-3 aspect-video w-full rounded bg-white/10 object-cover"
                />
              )}

              <span className="text-base font-semibold tracking-tight">
                {project.title}
              </span>
              <p className="mt-1 text-sm opacity-70">{project.description}</p>

              <span
                aria-hidden="true"
                className="group-hover:text-accent mt-4 font-mono text-sm opacity-50 transition-[opacity,color] group-hover:opacity-100"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
