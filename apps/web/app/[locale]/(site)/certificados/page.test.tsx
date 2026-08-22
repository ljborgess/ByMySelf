import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { Certificate } from '../../../../content/profile';
import { makeProfile } from '../../../../content/profile.fixture';
import messages from '../../../../messages/pt.json';

const mockProfile = makeProfile();

jest.mock('../../../../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CertificatesPage = require('./page').default as () => React.ReactElement;

function renderPage(certificates: Certificate[]) {
  mockProfile.certificates = certificates;

  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <CertificatesPage />
    </NextIntlClientProvider>,
  );
}

const validateLabel = new RegExp(messages.certificates.validate);

describe('CertificatesPage', () => {
  it('is headed as the Certificados page', () => {
    renderPage([]);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: messages.certificates.title,
      }),
    ).toBeVisible();
  });

  it('renders one entry per item, with issuer and date', () => {
    renderPage([
      {
        name: 'Introduction to Agent Skills',
        issuer: 'Anthropic',
        issuedAt: '2026-02',
        credentialUrl: null,
      },
      {
        name: 'Prompt Engineering',
        issuer: 'Alura',
        issuedAt: '2025-06',
        credentialUrl: null,
      },
    ]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Introduction to Agent Skills')).toBeVisible();
    expect(screen.getByText('Anthropic')).toBeVisible();
    expect(screen.getByText('fevereiro de 2026')).toBeVisible();
  });

  it('keeps the credential name in the language it was issued in', () => {
    // a certificate name is a proper noun; translating it would describe a
    // credential that does not exist
    renderPage([
      {
        name: 'TypeScript: Building an API with Type Safety',
        issuer: 'Alura',
        issuedAt: null,
        credentialUrl: null,
      },
    ]);

    expect(
      screen.getByText('TypeScript: Building an API with Type Safety'),
    ).toBeVisible();
  });

  it('orders the most recently issued first', () => {
    renderPage([
      {
        name: 'Antigo',
        issuer: 'Emissor',
        issuedAt: '2023-01',
        credentialUrl: null,
      },
      {
        name: 'Recente',
        issuer: 'Emissor',
        issuedAt: '2026-01',
        credentialUrl: null,
      },
    ]);

    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Recente', 'Antigo']);
  });

  describe('validation link (RF-PUB6)', () => {
    it('links to the credential when there is one', () => {
      renderPage([
        {
          name: 'Certificado',
          issuer: 'Emissor',
          issuedAt: '2026-01',
          credentialUrl: 'https://exemplo.com/credencial/123',
        },
      ]);

      const link = screen.getByRole('link', { name: validateLabel });

      expect(link).toHaveAttribute(
        'href',
        'https://exemplo.com/credencial/123',
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders no link at all when there is none', () => {
      renderPage([
        {
          name: 'Certificado',
          issuer: 'Emissor',
          issuedAt: '2026-01',
          credentialUrl: null,
        },
      ]);

      // a dead anchor would read as a bug; an absent one reads as an
      // unverified claim, which is what it is
      expect(
        screen.queryByRole('link', { name: validateLabel }),
      ).not.toBeInTheDocument();
      // the entry itself still shows
      expect(screen.getByText('Certificado')).toBeVisible();
    });

    it('links only the entries that have a URL', () => {
      renderPage([
        {
          name: 'Com link',
          issuer: 'Emissor',
          issuedAt: '2026-02',
          credentialUrl: 'https://exemplo.com/1',
        },
        {
          name: 'Sem link',
          issuer: 'Emissor',
          issuedAt: '2026-01',
          credentialUrl: null,
        },
      ]);

      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: validateLabel })).toHaveLength(
        1,
      );
    });
  });

  it('omits the date rather than leaving a gap when there is none', () => {
    // the current profile is exactly this: names and issuers, no dates
    renderPage([
      {
        name: 'Certificado',
        issuer: 'Emissor',
        issuedAt: null,
        credentialUrl: null,
      },
    ]);

    expect(screen.getByText('Certificado')).toBeVisible();
    expect(screen.getByText('Emissor')).toBeVisible();
    expect(screen.queryByText(/de 20\d\d/)).not.toBeInTheDocument();
  });

  it('says so when there is nothing to list', () => {
    renderPage([]);

    expect(screen.getByText(messages.certificates.empty)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
