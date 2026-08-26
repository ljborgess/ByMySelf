import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { Certificate } from '../content/profile';
import messages from '../messages/pt.json';
import { CertificatesContent } from './certificates-content';

function renderContent(certificates: Certificate[]) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <CertificatesContent certificates={certificates} />
    </NextIntlClientProvider>,
  );
}

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  Element.prototype.scrollIntoView = jest.fn();
});

describe('CertificatesContent', () => {
  it('shows the empty state message when there is no certificate', () => {
    renderContent([]);

    expect(screen.getByText(messages.certificates.empty)).toBeInTheDocument();
  });

  it('sorts dated entries by issue date descending, ahead of undated ones', () => {
    renderContent([
      {
        name: 'Sem data',
        issuer: 'Emissor C',
        issuedAt: null,
        credentialUrl: null,
        imageUrl: null,
      },
      {
        name: 'Mais antigo',
        issuer: 'Emissor A',
        issuedAt: '2020-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
      {
        name: 'Mais recente',
        issuer: 'Emissor B',
        issuedAt: '2024-06-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    // the most recently issued certificate sorts first, so it's the
    // initial active card
    expect(
      screen.getByRole('heading', { name: 'Mais recente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Emissor B')).toBeInTheDocument();
    expect(screen.queryByText('Emissor A')).not.toBeInTheDocument();
  });

  it('renders a credential validation link when the entry has a URL', () => {
    renderContent([
      {
        name: 'Certificado',
        issuer: 'Emissor',
        issuedAt: '2024-01-01',
        credentialUrl: 'https://example.com/credential',
        imageUrl: null,
      },
    ]);

    const link = screen.getByRole('link', {
      name: new RegExp(messages.certificates.validate),
    });

    expect(link).toHaveAttribute('href', 'https://example.com/credential');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the credential link when the entry has no URL', () => {
    renderContent([
      {
        name: 'Certificado sem link',
        issuer: 'Emissor',
        issuedAt: '2024-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    expect(
      screen.queryByRole('link', {
        name: new RegExp(messages.certificates.validate),
      }),
    ).not.toBeInTheDocument();
  });

  it('switches the active card when a different node is clicked', async () => {
    const user = userEvent.setup();
    renderContent([
      {
        name: 'Primeiro certificado',
        issuer: 'Emissor 1',
        issuedAt: '2024-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
      {
        name: 'Segundo certificado',
        issuer: 'Emissor 2',
        issuedAt: '2020-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Segundo certificado' }),
    );

    expect(screen.getByText('Emissor 2')).toBeInTheDocument();
  });
});
