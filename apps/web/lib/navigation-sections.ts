/**
 * The public site's sections, in the order the header shows them, matching
 * the route contract in docs/arquitetura.md.
 *
 * Single source shared by the header and its test, so a section added later
 * cannot be linked without the test noticing -- and cannot be tested without
 * actually being linked.
 *
 * `messageKey` indexes into the `nav` block of the messages file. Most of
 * these routes do not exist yet; the pages arrive in the following
 * sub-issues, so the links 404 until each lands.
 */
export const NAVIGATION_SECTIONS = [
  { href: '/', messageKey: 'home' },
  { href: '/sobre', messageKey: 'about' },
  { href: '/formacao', messageKey: 'education' },
  { href: '/certificados', messageKey: 'certificates' },
  { href: '/projetos', messageKey: 'projects' },
] as const;

export type NavigationSection = (typeof NAVIGATION_SECTIONS)[number];
