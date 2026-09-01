import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { makeProfile } from '../../../../content/profile.fixture';
import messages from '../../../../messages/pt.json';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      kill: jest.fn(),
      revert: jest.fn(),
      from: jest.fn().mockReturnThis(),
      fromTo: jest.fn().mockReturnThis(),
      to: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    })),
    set: jest.fn(),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

/** Fully populated: individual tests blank out what they are checking. */
const mockProfile = makeProfile({
  bio: 'Primeira linha da bio.\n\nSegunda linha.',
  cvUrl: '/cv-pt.pdf',
  skills: [
    { name: 'NestJS', level: 'EXPERT' },
    { name: 'PostgreSQL', level: 'ADV' },
    { name: 'TypeScript', level: 'EXPERT' },
  ],
  languages: [
    { language: 'Português', level: 'nativo' },
    { language: 'Inglês', level: 'avançado' },
  ],
});

jest.mock('../../../../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AboutPage = require('./page').default as () => React.ReactElement;

function renderAbout() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <AboutPage />
    </NextIntlClientProvider>,
  );
}

const fullProfile = { ...mockProfile };

describe('AboutPage', () => {
  beforeEach(() => {
    Object.assign(mockProfile, fullProfile);
  });

  it('is headed as the Sobre page', () => {
    renderAbout();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.about.title }),
    ).toBeVisible();
  });

  it('shows the bio (RF-PUB4)', () => {
    renderAbout();

    expect(screen.getByText(/Primeira linha da bio/)).toBeVisible();
  });

  it('lists every skill', () => {
    renderAbout();

    for (const skill of fullProfile.skills) {
      expect(screen.getByText(skill.name)).toBeVisible();
    }
  });

  it('lists each language with its proficiency level', () => {
    renderAbout();

    for (const { language, level } of fullProfile.languages) {
      expect(screen.getByText(language)).toBeVisible();
      expect(screen.getByText(new RegExp(level))).toBeVisible();
    }
  });

  describe('CV download (RF-PUB7)', () => {
    it('points at the static file and asks the browser to download it', () => {
      renderAbout();

      const link = screen.getByRole('link', {
        name: new RegExp(messages.about.downloadCv),
      });

      expect(link).toHaveAttribute('href', '/cv-pt.pdf');
      expect(link).toHaveAttribute('download');
    });

    it('renders no button at all while there is no CV', () => {
      mockProfile.cvUrl = null;

      renderAbout();

      expect(
        screen.queryByRole('link', {
          name: new RegExp(messages.about.downloadCv),
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('sections that have no content yet', () => {
    it('omits the bio heading rather than showing it empty', () => {
      mockProfile.bio = null;

      renderAbout();

      expect(
        screen.queryByRole('heading', { name: messages.about.bioHeading }),
      ).not.toBeInTheDocument();
    });

    it('omits the skills and languages sections when both lists are empty', () => {
      mockProfile.skills = [];
      mockProfile.languages = [];

      renderAbout();

      expect(
        screen.queryByRole('heading', { name: messages.about.skillsHeading }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('heading', {
          name: messages.about.languagesHeading,
        }),
      ).not.toBeInTheDocument();
    });

    it('still renders the page identifiably with nothing filled in', () => {
      Object.assign(mockProfile, {
        bio: null,
        cvUrl: null,
        skills: [],
        languages: [],
      });

      renderAbout();

      expect(
        screen.getByRole('heading', { level: 1, name: messages.about.title }),
      ).toBeVisible();
      expect(screen.getByText(mockProfile.headline)).toBeVisible();
    });
  });

  describe('photo', () => {
    it('falls back to initials when there is no photo', () => {
      renderAbout();

      expect(screen.getByText('NS')).toBeInTheDocument();
    });

    it('renders the photo when one is set', () => {
      mockProfile.photoUrl = 'https://example.com/foto.jpg';

      renderAbout();

      expect(
        screen.getByRole('img', { name: mockProfile.name }),
      ).toBeInTheDocument();
    });
  });
});
