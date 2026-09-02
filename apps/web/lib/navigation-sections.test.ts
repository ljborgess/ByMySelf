import messages from '../messages/pt.json';
import { NAVIGATION_SECTIONS } from './navigation-sections';

describe('NAVIGATION_SECTIONS', () => {
  it('covers every section of the route contract', () => {
    // docs/arquitetura.md: home, sobre, credenciais (formação+certificados), projetos
    expect(NAVIGATION_SECTIONS.map((section) => section.href)).toEqual([
      '/',
      '/sobre',
      '/credenciais',
      '/projetos',
    ]);
  });

  it('has a translated label for every section', () => {
    // a section added without its label would otherwise render the raw key
    for (const section of NAVIGATION_SECTIONS) {
      expect(messages.nav).toHaveProperty(section.messageKey);
      expect(messages.nav[section.messageKey]).toBeTruthy();
    }
  });

  it('stores hrefs without a locale prefix', () => {
    // next-intl's Link adds the prefix; hardcoding /pt here would produce
    // /pt/pt/sobre and would need editing again when en is activated
    for (const section of NAVIGATION_SECTIONS) {
      expect(section.href).not.toMatch(/^\/(pt|en)(\/|$)/);
    }
  });
});
