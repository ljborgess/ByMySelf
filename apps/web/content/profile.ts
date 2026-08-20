/**
 * Institutional content, versioned in code rather than stored in the database
 * (docs/dominio.md): it changes a few times a year, which does not justify an
 * entity, a CRUD and its tests.
 *
 * Single-locale for now. Fase 3 splits the prose fields into profile.pt.ts /
 * profile.en.ts; the non-textual fields (links, photoUrl, dates) never
 * duplicate.
 *
 * `null` and `[]` mean "not filled in yet", and every consumer has to handle
 * it. That is deliberate: a portfolio showing a broken image, an empty
 * heading or a "Baixar CV" button that 404s is worse than one showing
 * neither.
 */
export type LanguageLevel =
  'básico' | 'intermediário' | 'avançado' | 'fluente' | 'nativo';

export interface Language {
  language: string;
  level: LanguageLevel;
}

export interface Education {
  course: string;
  /** Nullable: the CV names the course but not always the institution. */
  institution: string | null;
  /** ISO date or `YYYY-MM`. Nullable, and the period is then hidden. */
  startDate: string | null;
  /** `null` means ongoing, which the page shows as "Em andamento". */
  endDate: string | null;
  technologies?: string[];
}

export interface Profile {
  name: string;
  headline: string;
  /** Short paragraph: who you are. Omitted from the page while null. */
  bio: string | null;
  /** What you are looking for professionally. Omitted while null. */
  objective: string | null;
  /** External URL -- there is no upload in this project. */
  photoUrl: string | null;
  /** Downloadable CV. The button is not rendered while null. */
  cvUrl: string | null;
  skills: string[];
  languages: Language[];
  education: Education[];
  links: {
    github: string | null;
    linkedin: string | null;
    email: string | null;
  };
}

export const profile: Profile = {
  name: 'Luciano Borges',

  // From the CV's own summary line ("Frontend | Backend | Full-Stack") plus
  // the current role. REVIEW: the previous value said "Backend" only, which
  // undersold the Next.js/React half of the experience -- but how you want to
  // be positioned is your call, not the CV's.
  headline: 'Desenvolvedor Full-Stack — NestJS, Next.js e TypeScript',

  // DRAFT, written from the CV. Every fact here traces back to it, but the
  // voice is not yours -- rewrite it in your own words before this ships.
  bio: `Estudante de Sistemas de Informação, atualmente no 6º semestre, e desenvolvedor na B2ML, onde atuo como analista e desenvolvedor de sistemas.

Hoje lidero a re-arquitetura da Timer API para a Plataforma B2ML, um monolito modular que cobre vários domínios de negócio (timer, cliente, usuário, relatórios), incluindo a correção de vulnerabilidades críticas de controle de acesso e isolamento de dados entre tenants.

Meu foco é backend — NestJS, PostgreSQL, Docker — mas trabalho a stack completa, e me interesso especialmente por arquitetura, segurança e as práticas que fazem um projeto sobreviver ao próprio crescimento: teste, revisão e automação.`,

  // TODO: the one field the CV does not state. What kind of role or project
  // are you after? The file name suggested you are aiming at roles abroad,
  // but that is a guess and guesses do not belong on the page -- the section
  // stays hidden until you write it.
  objective: null,

  // TODO: an external image URL. The avatar falls back to initials while
  // this is null, so leaving it unset costs nothing but a photo.
  photoUrl: null,

  // TODO: the CV you sent is in English ("CV-EUA"), and this button is the
  // pt one. Export a PT-BR version to apps/web/public/cv-pt.pdf and set this
  // to '/cv-pt.pdf'. The English one becomes cv-en.pdf in Fase 3.
  cvUrl: null,

  // Straight from the CV's Skills section, plus the notable ones its project
  // descriptions name. Trim anything you would rather not be asked about in
  // an interview -- this list is a promise.
  skills: [
    'TypeScript',
    'Node.js',
    'NestJS',
    'Next.js',
    'React',
    'PostgreSQL',
    'MySQL',
    'Drizzle ORM',
    'MikroORM',
    'Zod',
    'TanStack Query',
    'Tailwind CSS',
    'Docker',
    'Turborepo',
    'JWT',
    'Testes unitários',
    'Microsserviços',
    'Sistemas distribuídos',
  ],

  // The CV says "Portuguese, English – All professional proficiency or
  // above". REVIEW: "professional proficiency" is between avançado and
  // fluente in this scale, so I picked the lower one -- raise it if fluente
  // is the honest answer.
  languages: [
    { language: 'Português', level: 'nativo' },
    { language: 'Inglês', level: 'avançado' },
  ],

  // The CV says only "Information Systems — currently enrolled, 6th
  // semester", so that is all this claims.
  education: [
    {
      course: 'Sistemas de Informação',
      // TODO: the institution's name. The card shows the course alone until
      // then rather than inventing one.
      institution: null,
      // TODO: when you started (e.g. '2023-02'). The 6th semester implies
      // roughly 2023, but "roughly" has no place on a page a recruiter
      // reads -- the period stays hidden while this is null.
      startDate: null,
      // null = ongoing, rendered as "Em andamento"
      endDate: null,
      // TODO: optional. Technologies the course actually covered, if you
      // want the formal education tied to practical skill (RF-PUB5).
    },
  ],

  links: {
    github: 'https://github.com/ljborgess',
    linkedin: 'https://www.linkedin.com/in/lucianojunqueira/',
    // On the CV you distribute, so publishing it is a decision you have
    // already made. Worth knowing it is not the same decision: a web page
    // gets scraped far more aggressively than a PDF. Set to null to drop the
    // link entirely.
    email: 'lucianoborges04@hotmail.com',
  },
};
