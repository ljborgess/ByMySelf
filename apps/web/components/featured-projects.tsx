'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import type { PublicProjectListItem } from '../lib/projects';
import { Carousel } from './carousel';

/**
 * Prévia de projetos em destaque na home (docs/design-aurora-futurista.md).
 * A home hoje só linka para /projetos (SectionCards) sem mostrar projeto
 * nenhum -- esta seção é a primeira prova social visível sem sair da home.
 *
 * Recebe a lista já filtrada por `featured`, não filtra sozinha: quem chama
 * (page.tsx) já decide o que "falhou ao carregar" significa aqui (nada --
 * ver o comentário lá), então este componente só sabe renderizar o que
 * recebeu.
 *
 * 'use client': Carousel é Client Component, e `getKey`/`renderItem` logo
 * abaixo são funções -- Server Component não pode passar função como prop
 * pra Client Component (nada que cruza essa fronteira pode, já que props
 * são serializadas). Pego rodando de verdade, não pelos testes unitários:
 * jsdom renderiza isolado e nunca exercita o split real servidor/cliente
 * do RSC (ver PR do #115).
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

      <Carousel
        items={projects}
        getKey={(project) => project.id}
        ariaLabel={t('featuredHeading')}
        renderItem={(project) => (
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
        )}
      />
    </section>
  );
}
