import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { SiteFooter } from './site-footer';

function renderFooter() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <SiteFooter />
    </NextIntlClientProvider>,
  );
}

describe('SiteFooter', () => {
  it('renders as a footer landmark', () => {
    renderFooter();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('shows the current year alongside the site owner', () => {
    renderFooter();

    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(messages.site.name)),
    ).toBeInTheDocument();
  });

  it('opens external links safely', () => {
    renderFooter();

    for (const label of Object.values(messages.footer.links)) {
      const link = screen.getByRole('link', { name: label });

      expect(link).toHaveAttribute('target', '_blank');
      // noreferrer as well as noopener: without it the target page still
      // learns which page the visitor came from
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    }
  });
});
