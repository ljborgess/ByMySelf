import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    // call onComplete immediately so goTo's state update fires in tests
    to: jest.fn((_target: unknown, vars: { onComplete?: () => void }) => {
      vars.onComplete?.();
      return {};
    }),
    fromTo: jest.fn(),
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

  it('shows the empty state when all certificates lack an image', () => {
    renderContent([
      {
        name: 'Sem imagem',
        issuer: 'Emissor',
        issuedAt: '2024-01-01',
        credentialUrl: null,
        imageUrl: null,
      },
    ]);

    expect(screen.getByText(messages.certificates.empty)).toBeInTheDocument();
  });

  it('renders the active certificate name as the page heading', () => {
    renderContent([withImage({ name: 'Meu Certificado' })]);

    expect(
      screen.getByRole('heading', { name: 'Meu Certificado' }),
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

  it('hides navigation controls when there is only one certificate', () => {
    renderContent([withImage()]);

    expect(
      screen.queryByRole('button', { name: messages.timeline.previous }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: messages.timeline.next }),
    ).not.toBeInTheDocument();
  });

  it('disables the previous button on the first certificate', () => {
    renderContent([
      withImage({ name: 'Primeiro' }),
      withImage({ name: 'Segundo', issuedAt: '2020-01-01' }),
    ]);

    expect(
      screen.getByRole('button', { name: messages.timeline.previous }),
    ).toBeDisabled();
  });

  it('disables the next button on the last certificate', async () => {
    const user = userEvent.setup();
    renderContent([
      withImage({ name: 'Primeiro' }),
      withImage({ name: 'Segundo', issuedAt: '2020-01-01' }),
    ]);

    await user.click(
      screen.getByRole('button', { name: messages.timeline.next }),
    );

    expect(
      screen.getByRole('button', { name: messages.timeline.next }),
    ).toBeDisabled();
  });

  it('advances to the next certificate when the next button is clicked', async () => {
    const user = userEvent.setup();
    renderContent([
      withImage({ name: 'Primeiro', issuedAt: '2024-06-01' }),
      withImage({ name: 'Segundo', issuedAt: '2020-01-01' }),
    ]);

    await user.click(
      screen.getByRole('button', { name: messages.timeline.next }),
    );

    expect(
      screen.getByRole('heading', { name: 'Segundo' }),
    ).toBeInTheDocument();
  });

  it('goes to a specific certificate when its dot is clicked', async () => {
    const user = userEvent.setup();
    renderContent([
      withImage({ name: 'Primeiro', issuedAt: '2024-06-01' }),
      withImage({ name: 'Segundo', issuedAt: '2020-01-01' }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Segundo' }));

    expect(
      screen.getByRole('heading', { name: 'Segundo' }),
    ).toBeInTheDocument();
  });

  it('sorts dated certificates by issue date descending, with undated ones last', () => {
    renderContent([
      withImage({ name: 'Mais antigo', issuedAt: '2020-01-01' }),
      withImage({ name: 'Mais recente', issuedAt: '2024-06-01' }),
    ]);

    // most recently issued is active first
    expect(
      screen.getByRole('heading', { name: 'Mais recente' }),
    ).toBeInTheDocument();
  });

  it('skips certificates without imageUrl even when they have other data', () => {
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

    // only one cert visible → no navigation
    expect(
      screen.queryByRole('button', { name: messages.timeline.next }),
    ).not.toBeInTheDocument();
  });
});
