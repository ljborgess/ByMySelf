import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../content/profile.fixture';
import messages from '../messages/pt.json';
import { StatsSection } from './stats-section';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      kill: jest.fn(),
      revert: jest.fn(),
      to: jest.fn(),
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

const mockProfile = makeProfile({
  skills: ['TypeScript', 'NestJS', 'Next.js', 'PostgreSQL'],
  certificates: [
    {
      name: 'Certificado A',
      issuer: 'Emissor',
      issuedAt: null,
      credentialUrl: null,
    },
    {
      name: 'Certificado B',
      issuer: 'Emissor',
      issuedAt: null,
      credentialUrl: null,
    },
  ],
  languages: [
    { language: 'Português', level: 'nativo' },
    { language: 'Inglês', level: 'avançado' },
  ],
});

jest.mock('../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function renderStats(projectCount = 5) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <StatsSection projectCount={projectCount} />
    </NextIntlClientProvider>,
  );
}

describe('StatsSection', () => {
  it('renders the real project count passed in, not a placeholder', () => {
    renderStats(7);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('counts technologies from the real skills array', () => {
    renderStats();

    // 4 skills configured on mockProfile above
    expect(screen.getAllByText('4')).not.toHaveLength(0);
  });

  it('counts certificates and languages from their real arrays', () => {
    renderStats();

    // certificates: 2, languages: 2 -- both render "2" (no label collision
    // check needed here, just that the count is not zero or wrong)
    const twos = screen.getAllByText('2');
    expect(twos.length).toBeGreaterThanOrEqual(2);
  });

  it('shows every stat label', () => {
    renderStats();

    expect(screen.getByText(messages.stats.projects)).toBeInTheDocument();
    expect(screen.getByText(messages.stats.technologies)).toBeInTheDocument();
    expect(screen.getByText(messages.stats.certificates)).toBeInTheDocument();
    expect(screen.getByText(messages.stats.languages)).toBeInTheDocument();
  });

  it('shows the badge label', () => {
    renderStats();

    expect(screen.getByText(messages.stats.badge)).toBeInTheDocument();
  });
});
