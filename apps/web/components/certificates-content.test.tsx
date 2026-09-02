import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { Certificate } from '../content/profile';
import messages from '../messages/pt.json';
import { CertificatesContent } from './certificates-content';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      revert: jest.fn(),
      from: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function renderContent(certificates: Certificate[]) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <CertificatesContent certificates={certificates} />
    </NextIntlClientProvider>,
  );
}

const withImage = (overrides: Partial<Certificate> = {}): Certificate => ({
  name: 'Certificado',
  issuer: 'Emissor',
  issuedAt: '2024-01-01',
  credentialUrl: null,
  imageUrl: '/certificados/example.png',
  ...overrides,
});

describe('CertificatesContent', () => {
  it('shows the empty state when no certificates are provided', () => {
    renderContent([]);

    expect(screen.getByText(messages.certificates.empty)).toBeInTheDocument();
  });

  it('renders a certificate without an image, falling back to the issuer initial', () => {
    renderContent([
      {
        name: 'Sem imagem',
        issuer: 'Emissor',
        issuedAt: '2024-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    expect(
      screen.getByRole('heading', { name: 'Sem imagem' }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.certificates.noImage)).toBeInTheDocument();
  });

  it('renders every certificate as its own card, not just the ones with an image', () => {
    renderContent([
      withImage({ name: 'Com imagem' }),
      {
        name: 'Sem imagem',
        issuer: 'Outro',
        issuedAt: '2024-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    expect(
      screen.getByRole('heading', { name: 'Com imagem' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Sem imagem' }),
    ).toBeInTheDocument();
  });

  it('renders the issuer below the heading', () => {
    renderContent([withImage({ issuer: 'Alura' })]);

    expect(screen.getByText('Alura')).toBeInTheDocument();
  });

  it('renders a credential validation link when the entry has a URL', () => {
    renderContent([
      withImage({ credentialUrl: 'https://example.com/credential' }),
    ]);

    const link = screen.getByRole('link', {
      name: new RegExp(messages.certificates.validate),
    });

    expect(link).toHaveAttribute('href', 'https://example.com/credential');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits the credential link when the entry has no URL', () => {
    renderContent([withImage({ credentialUrl: null })]);

    expect(
      screen.queryByRole('link', {
        name: new RegExp(messages.certificates.validate),
      }),
    ).not.toBeInTheDocument();
  });

  it('sorts dated certificates by issue date descending, with undated ones last', () => {
    renderContent([
      withImage({ name: 'Mais antigo', issuedAt: '2020-01-01' }),
      withImage({ name: 'Mais recente', issuedAt: '2024-06-01' }),
    ]);

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Mais recente');
    expect(headings[1]).toHaveTextContent('Mais antigo');
  });
});
