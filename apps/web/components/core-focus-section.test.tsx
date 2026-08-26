import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import messages from '../messages/pt.json';
import { CoreFocusSection } from './core-focus-section';

// CoreFocusSection renders PinnedFrameSection, which needs GSAP/ScrollTrigger
// -- mocked the same way pinned-frame-section.test.tsx does.
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      kill: jest.fn(),
      from: jest.fn(),
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

const mockProfile = makeProfile({
  name: 'Fulana Exemplo',
  headline: 'Desenvolvedora Full-Stack — NestJS, Next.js e TypeScript',
  bio: 'Primeiro parágrafo, sobre quem sou.\n\nSegundo parágrafo, contexto.\n\nTerceiro parágrafo, foco técnico.',
});

jest.mock('../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function renderSection() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <CoreFocusSection />
    </NextIntlClientProvider>,
  );
}

describe('CoreFocusSection', () => {
  it('renders nothing without a bio -- an empty quote would look broken, not absent', () => {
    mockProfile.bio = null;
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  it('splits the headline at the em dash into bold and italic parts', () => {
    mockProfile.bio = 'Primeiro parágrafo.\n\nÚltimo parágrafo.';
    renderSection();

    expect(screen.getByText('Desenvolvedora Full-Stack')).toBeInTheDocument();
    expect(
      screen.getByText('NestJS, Next.js e TypeScript'),
    ).toBeInTheDocument();
  });

  it('falls back to the whole headline as bold when there is no em dash', () => {
    mockProfile.bio = 'Primeiro parágrafo.\n\nÚltimo parágrafo.';
    mockProfile.headline = 'Sem travessão aqui';
    renderSection();

    expect(screen.getByText('Sem travessão aqui')).toBeInTheDocument();
  });

  it('shows the first paragraph under "Sobre" and the last under "Foco"', () => {
    mockProfile.headline =
      'Desenvolvedora Full-Stack — NestJS, Next.js e TypeScript';
    mockProfile.bio =
      'Primeiro parágrafo, sobre quem sou.\n\nSegundo parágrafo, contexto.\n\nTerceiro parágrafo, foco técnico.';
    renderSection();

    expect(
      screen.getByText('Primeiro parágrafo, sobre quem sou.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Terceiro parágrafo, foco técnico.'),
    ).toBeInTheDocument();
  });

  it('signs with the profile name', () => {
    mockProfile.bio = 'Primeiro parágrafo.\n\nÚltimo parágrafo.';
    renderSection();

    expect(screen.getByText('Fulana Exemplo')).toBeInTheDocument();
  });
});
