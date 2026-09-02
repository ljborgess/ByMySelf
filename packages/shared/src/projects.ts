/**
 * `/projetos` shows the owner's pinned repositories, straight from GitHub
 * (docs/decisao-projetos-github-pins.md). No database, no admin CRUD: the
 * curation already happened when the owner pinned the repo on their GitHub
 * profile.
 */
export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  /** `Repository.openGraphImageUrl` -- the social preview GitHub already
   * generates per repo (custom if the owner set one). Used as the card's
   * "amostra". */
  imageUrl: string;
  /** Repo languages by byte size, most-used first, capped for card display. */
  techStack: string[];
}
