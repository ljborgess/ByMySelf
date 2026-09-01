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

export type SkillLevel = 'EXPERT' | 'ADV' | 'INT' | 'JR';

export interface Skill {
  name: string;
  level: SkillLevel;
}

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

export interface Certificate {
  /**
   * The credential's actual title, in the language it was issued in. Not
   * translated: a certificate name is a proper noun, and rendering
   * "Introduction to Agent Skills" in Portuguese would describe a credential
   * that does not exist.
   */
  name: string;
  issuer: string;
  /** ISO date or `YYYY-MM`. Nullable, and the date is then hidden. */
  issuedAt: string | null;
  /**
   * Validation link. `null` renders no link at all rather than a dead one --
   * an unverifiable claim is better shown as a plain claim than as a broken
   * promise of verification (RF-PUB6).
   */
  credentialUrl: string | null;
  /**
   * The certificate itself, as an image under `apps/web/public/certificados`.
   * `null` falls back to a generated panel with the issuer's monogram -- a
   * card with a broken image reads as a bug, one with a drawn panel reads as
   * a card.
   */
  imageUrl: string | null;
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
  skills: Skill[];
  languages: Language[];
  education: Education[];
  certificates: Certificate[];
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

  // The English CV ("CV-EUA") you sent, served straight from
  // apps/web/public. The file name is what the visitor's browser saves, so
  // it spells you out instead of landing as "cv.pdf" in a downloads folder.
  //
  // TODO: it is the English CV under the pt locale. Export a PT-BR version
  // and split into cv-pt.pdf / cv-en.pdf in Fase 3, when the en locale
  // actually exists.
  cvUrl: '/luciano-borges-cv.pdf',

  // Straight from the CV's Skills section, plus the notable ones its project
  // descriptions name. Trim anything you would rather not be asked about in
  // an interview -- this list is a promise.
  skills: [
    { name: 'TypeScript', level: 'EXPERT' },
    { name: 'Node.js', level: 'EXPERT' },
    { name: 'NestJS', level: 'EXPERT' },
    { name: 'Next.js', level: 'ADV' },
    { name: 'React', level: 'ADV' },
    { name: 'PostgreSQL', level: 'ADV' },
    { name: 'Drizzle ORM', level: 'ADV' },
    { name: 'Zod', level: 'ADV' },
    { name: 'Tailwind CSS', level: 'ADV' },
    { name: 'JWT', level: 'ADV' },
    { name: 'MySQL', level: 'INT' },
    { name: 'MikroORM', level: 'INT' },
    { name: 'TanStack Query', level: 'INT' },
    { name: 'Docker', level: 'INT' },
    { name: 'Turborepo', level: 'INT' },
    { name: 'Testes unitários', level: 'INT' },
    { name: 'Microsserviços', level: 'INT' },
    { name: 'Sistemas distribuídos', level: 'JR' },
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

  // Names and issuers straight from the CV, kept in the language each was
  // issued in. The CV gives neither dates nor validation links, so both are
  // null -- and RF-PUB6 is about verifiability, which makes credentialUrl
  // the field most worth filling: without it each line is a claim a
  // recruiter has to take on trust.
  //
  // The two Alura entries below carry the name printed on the certificate
  // itself, in Portuguese, instead of the CV's English rendering of it: the
  // page now shows the image and the validation link side by side, and a
  // title that does not match the document under it reads as the wrong file.
  certificates: [
    {
      name: 'IA: explorando o potencial da inteligência artificial generativa',
      issuer: 'Alura',
      issuedAt: '2026-06',
      credentialUrl:
        'https://cursos.alura.com.br/certificate/2df21c18-58cd-420d-ba35-a5244957dd67',
      imageUrl: '/certificados/ia-generativa.png',
    },
    {
      name: 'Pensamento computacional: fundamentos da computação e lógica de programação',
      issuer: 'Alura',
      issuedAt: '2026-06',
      credentialUrl:
        'https://cursos.alura.com.br/certificate/1ddb390a-9ac9-4dd2-93b9-5f960ff80835',
      imageUrl: '/certificados/pensamento-computacional.png',
    },
    {
      name: 'Introduction to Agent Skills',
      issuer: 'Anthropic',
      // TODO: when it was issued (e.g. '2026-02'). The date is hidden while
      // this is null.
      issuedAt: null,
      // TODO: the validation URL. No link is rendered while this is null,
      // rather than a dead one.
      credentialUrl: null,
      // TODO: drop the certificate image in apps/web/public/certificados/ and
      // point this at it (e.g. '/certificados/agent-skills.png'). Until then
      // the card draws the issuer's monogram instead.
      imageUrl: null,
    },
    {
      name: 'TypeScript: Building an API with Type Safety',
      issuer: 'Alura',
      issuedAt: null,
      credentialUrl: null,
      imageUrl: null,
    },
    {
      name: 'Prompt Engineering',
      issuer: 'Alura',
      issuedAt: null,
      credentialUrl: null,
      imageUrl: null,
    },
    {
      name: 'Introduction to JavaScript',
      issuer: 'Udemy',
      issuedAt: null,
      credentialUrl: null,
      imageUrl: null,
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
