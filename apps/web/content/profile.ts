/**
 * Institutional content, versioned in code rather than stored in the database
 * (docs/dominio.md): it changes a few times a year, which does not justify an
 * entity, a CRUD and its tests.
 *
 * Single-locale for now. Fase 3 splits the prose fields into profile.pt.ts /
 * profile.en.ts; the non-textual fields (links, photoUrl, dates) never
 * duplicate.
 *
 * `null` means "not filled in yet", and every consumer has to handle it. That
 * is deliberate: a portfolio showing a broken image or a placeholder bio is
 * worse than one showing neither, and inventing plausible-looking values here
 * would put wrong information on every page.
 */
export interface Profile {
  name: string;
  headline: string;
  /** External URL -- there is no upload in this project. */
  photoUrl: string | null;
  links: {
    github: string | null;
    linkedin: string | null;
    email: string | null;
  };
}

export const profile: Profile = {
  name: 'Luciano Borges',
  headline: 'Desenvolvedor Backend Node.js/NestJS',

  // TODO: an external image URL. The hero renders initials while this is
  // null, so leaving it unset costs nothing but a photo.
  photoUrl: null,

  links: {
    github: 'https://github.com/ljborgess',
    linkedin: 'https://www.linkedin.com/in/lucianojunqueira/',
    // TODO: only if you want it public. Publishing an address invites
    // scraping, so this stays unset until you decide -- the footer simply
    // omits the link.
    email: null,
  },
};
