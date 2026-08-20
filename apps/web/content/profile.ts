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
 * neither, and inventing plausible-looking values here would put wrong
 * information on every page.
 */
export type LanguageLevel =
  'básico' | 'intermediário' | 'avançado' | 'fluente' | 'nativo';

export interface Language {
  language: string;
  level: LanguageLevel;
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
  links: {
    github: string | null;
    linkedin: string | null;
    email: string | null;
  };
}

export const profile: Profile = {
  name: 'Luciano Borges',

  // TODO: confirm. Taken from the example in docs/dominio.md, not from you.
  headline: 'Desenvolvedor Backend Node.js/NestJS',

  // TODO: a short paragraph in the first person. The Sobre page omits the
  // section entirely while this is null, rather than showing a bare heading.
  bio: null,

  // TODO: the kind of role or project you are after.
  objective: null,

  // TODO: an external image URL. The avatar falls back to initials while
  // this is null, so leaving it unset costs nothing but a photo.
  photoUrl: null,

  // TODO: put the file at apps/web/public/cv-pt.pdf and set this to
  // '/cv-pt.pdf'. Deliberately not a hardcoded path: a "Baixar CV" button
  // that 404s is worse than no button, so it only renders once this is set.
  cvUrl: null,

  // TODO: the technologies you want to be evaluated on.
  skills: [],

  // TODO: e.g. { language: 'Inglês', level: 'avançado' }
  languages: [],

  links: {
    github: 'https://github.com/ljborgess',
    linkedin: 'https://www.linkedin.com/in/lucianojunqueira/',
    // TODO: only if you want it public. Publishing an address invites
    // scraping, so this stays unset until you decide -- the footer simply
    // omits the link.
    email: null,
  },
};
