# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recrutadores e gestores de contratação no Brasil, avaliando Luciano Borges para vagas full-time de desenvolvimento backend/full-stack. O site é single-locale em português por enquanto; uma versão em inglês para recrutadores internacionais/remotos está planejada para uma fase futura ("Fase 3" no código: `profile.en.ts`, `cv-en.pdf`), mas não é o foco atual.

Usuário secundário: o próprio Luciano, através do painel administrativo autenticado (conta única, sem cadastro público) para gerenciar os projetos exibidos no site.

## Product Purpose

Portfólio pessoal que funciona como ferramenta de busca de emprego: apresenta experiência, formação, certificados e projetos de forma verificável para quem está avaliando o candidato, e permite ao próprio Luciano manter esse conteúdo atualizado sem precisar de um CRUD genérico ou de editar código para tudo (perfil institucional é versionado em código; projetos são gerenciados via painel admin).

Sucesso = um recrutador consegue avaliar rapidamente as qualificações reais do candidato, sem alegações não verificáveis nem elementos quebrados (imagem ausente, botão de CV morto, link de certificado inválido).

## Positioning

Desenvolvedor full-stack com foco declarado em backend — arquitetura, segurança e as práticas que fazem um projeto sobreviver ao próprio crescimento (testes, revisão, automação) — não um generalista sem especialização. A prova principal é concreta: liderar a re-arquitetura da Timer API na B2ML (monolito modular multi-tenant) e a correção de vulnerabilidades críticas de controle de acesso e isolamento de dados entre tenants.

## Operating Context

- Site público com seções: início, sobre, formação, certificados, projetos (rotas `/`, `/sobre`, `/formacao`, `/certificados`, `/projetos`).
- Painel administrativo autenticado (JWT via cookie `HttpOnly`) para CRUD de projetos; conta única, criada apenas via CLI (`pnpm cli create-admin`), sem fluxo de cadastro ou "esqueci minha senha" — recuperação é recriar a conta pelo CLI.
- Conteúdo institucional (perfil, bio, educação, certificados, links) é versionado em código (`content/profile.ts`), não no banco — muda poucas vezes por ano.
- `null` e `[]` nos campos de conteúdo significam "ainda não preenchido", e a página deve ocultar a seção correspondente em vez de mostrar dado quebrado ou inventado.

## Capabilities and Constraints

- Objetivo profissional (campo `objective`): vagas full-time de backend/full-stack — não freelance/contrato como prioridade.
- CV para download (`cvUrl`): ainda não publicado (pendente exportar a versão PT-BR); botão de download só aparece quando o campo está preenchido.
- Foto de perfil (`photoUrl`): ainda não definida; avatar cai para iniciais enquanto isso.
- Instituição e datas da formação em Sistemas de Informação (6º semestre): ainda não preenchidas.
- Links de validação de certificados: nenhum preenchido ainda — certificado sem link mostra a alegação como texto simples, nunca como link quebrado.
- Sem endpoint de cadastro público nem multi-tenant no admin — é uma ferramenta pessoal de um usuário só.

## Brand Commitments

- Nome: Luciano Borges.
- Links confirmados: GitHub (`github.com/ljborgess`), LinkedIn (`linkedin.com/in/lucianojunqueira`), e-mail de contato (`lucianoborges04@hotmail.com`).
- Headline atual: "Desenvolvedor Full-Stack — NestJS, Next.js e TypeScript".

## Evidence on Hand

- Bio e skills derivadas do CV do candidato (já versionadas em `content/profile.ts`), cobrindo TypeScript, Node.js, NestJS, Next.js, React, PostgreSQL, MySQL, Drizzle ORM, MikroORM, Zod, TanStack Query, Tailwind CSS, Docker, Turborepo, JWT, testes unitários, microsserviços, sistemas distribuídos.
- Seis certificados listados (Anthropic, Alura ×4, Udemy), nenhum com data ou link de validação ainda — não inventar essas datas/links.
- Sem depoimentos, estudos de caso, prêmios ou cobertura de imprensa disponíveis — não fabricar.
- Formação: apenas "Sistemas de Informação, cursando" confirmado; instituição e datas não devem ser inventadas.

## Product Principles

1. Nenhuma alegação não verificável no ar: campo vazio esconde a seção, nunca mostra dado inventado ou link quebrado (isso já é um princípio ativo no código, RF-PUB6).
2. Backend/arquitetura/segurança é o eixo de posicionamento — quando houver espaço para destaque, esse é o ângulo, não "full-stack genérico".
3. Conteúdo institucional muda raramente e vive em código; projetos mudam mais e vivem no admin — a distinção entre os dois fluxos é deliberada, não um caso de "falta terminar o CRUD".
4. Internacionalização (inglês) é fase futura confirmada, não escopo atual — não adiantar essa camada sem pedido explícito.
