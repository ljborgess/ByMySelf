import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { NAVIGATION_SECTIONS } from '../lib/navigation-sections';
import { SiteHeader } from './site-header';

/** Every section's visible label, read from the real messages file. */
const SECTION_LABELS = NAVIGATION_SECTIONS.map(
  (section) => messages.nav[section.messageKey],
);

function renderHeader() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <SiteHeader />
    </NextIntlClientProvider>,
  );
}

describe('SiteHeader', () => {
  it('links to every section of the site', () => {
    renderHeader();

    // driven off NAVIGATION_SECTIONS, so a section added there without a link
    // fails here rather than going unnoticed
    const desktopNav = screen.getAllByRole('navigation')[0];
    for (const label of SECTION_LABELS) {
      expect(
        within(desktopNav).getByRole('link', { name: label }),
      ).toBeVisible();
    }
  });

  it('points each link at the locale-prefixed route', () => {
    renderHeader();

    const desktopNav = screen.getAllByRole('navigation')[0];
    const hrefs = within(desktopNav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    // the locale prefix comes from next-intl's Link, not from hardcoded paths
    expect(hrefs).toEqual([
      '/pt',
      '/pt/sobre',
      '/pt/credenciais',
      '/pt/projetos',
    ]);
  });

  it('names the navigation for screen readers', () => {
    renderHeader();

    expect(
      screen.getAllByRole('navigation', { name: messages.nav.label }).length,
    ).toBeGreaterThan(0);
  });

  describe('on a narrow viewport (RNF-USA1, 375px)', () => {
    it('offers a toggle instead of five links across the header', () => {
      renderHeader();

      expect(
        screen.getByRole('button', { name: messages.nav.openMenu }),
      ).toBeInTheDocument();
    });

    it('keeps the collapsed links out of the accessibility tree until opened', () => {
      renderHeader();

      // one nav (the desktop one) before opening, two after -- `hidden` alone
      // would leave the collapsed links tabbable
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
    });

    it('reveals every section when the toggle is pressed', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(
        screen.getByRole('button', { name: messages.nav.openMenu }),
      );

      const navs = screen.getAllByRole('navigation');
      expect(navs).toHaveLength(2);

      const mobileNav = navs[1];
      for (const label of SECTION_LABELS) {
        expect(
          within(mobileNav).getByRole('link', { name: label }),
        ).toBeVisible();
      }
    });

    it('reports its state to assistive tech and flips the label', async () => {
      const user = userEvent.setup();
      renderHeader();

      const toggle = screen.getByRole('button', {
        name: messages.nav.openMenu,
      });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);

      expect(
        screen.getByRole('button', { name: messages.nav.closeMenu }),
      ).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes itself after a link is followed', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(
        screen.getByRole('button', { name: messages.nav.openMenu }),
      );
      const mobileNav = screen.getAllByRole('navigation')[1];
      await user.click(
        within(mobileNav).getByRole('link', { name: messages.nav.about }),
      );

      // otherwise the menu stays open covering the page just navigated to
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
    });
  });
});
