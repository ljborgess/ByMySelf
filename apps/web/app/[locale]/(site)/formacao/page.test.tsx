import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { Education } from '../../../../content/profile';
import { makeProfile } from '../../../../content/profile.fixture';
import messages from '../../../../messages/pt.json';

const mockProfile = makeProfile();

jest.mock('../../../../content/profile', () => ({
  get profile() {
    return mockProfile;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EducationPage = require('./page').default as () => React.ReactElement;

function renderPage(education: Education[]) {
  mockProfile.education = education;

  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <EducationPage />
    </NextIntlClientProvider>,
  );
}

describe('EducationPage', () => {
  it('is headed as the Formação page', () => {
    renderPage([]);

    expect(
      screen.getByRole('heading', { level: 1, name: messages.education.title }),
    ).toBeVisible();
  });

  it('renders one entry per item, with institution and period (RF-PUB5)', () => {
    renderPage([
      {
        course: 'Sistemas de Informação',
        institution: 'Universidade Exemplo',
        startDate: '2023-02',
        endDate: '2026-12',
      },
      {
        course: 'Técnico em Informática',
        institution: 'Escola Exemplo',
        startDate: '2019-02',
        endDate: '2021-12',
      },
    ]);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Sistemas de Informação')).toBeVisible();
    expect(screen.getByText('Universidade Exemplo')).toBeVisible();
    expect(screen.getByText('2023 – 2026')).toBeVisible();
  });

  it('lists the technologies tied to an entry', () => {
    renderPage([
      {
        course: 'Curso',
        institution: 'Instituição',
        startDate: '2023-02',
        endDate: null,
        technologies: ['Java', 'PostgreSQL'],
      },
    ]);

    expect(screen.getByText('Java')).toBeVisible();
    expect(screen.getByText('PostgreSQL')).toBeVisible();
  });

  describe('ongoing entries', () => {
    it('shows the ongoing label instead of an end year', () => {
      renderPage([
        {
          course: 'Curso',
          institution: 'Instituição',
          startDate: '2023-02',
          endDate: null,
        },
      ]);

      expect(
        screen.getByText(new RegExp(messages.education.ongoing)),
      ).toBeVisible();
      expect(screen.getByText('2023 – Em andamento')).toBeVisible();
    });

    it('still marks it ongoing when there is no start date either', () => {
      // the profile currently has exactly this shape: course known, dates not
      renderPage([
        {
          course: 'Sistemas de Informação',
          institution: null,
          startDate: null,
          endDate: null,
        },
      ]);

      // "em andamento" must not be lost for want of a date
      expect(screen.getByText(messages.education.ongoing)).toBeVisible();
    });

    it('puts it before a finished entry', () => {
      renderPage([
        {
          course: 'Concluído',
          institution: null,
          startDate: '2015-01',
          endDate: '2018-12',
        },
        {
          course: 'Em curso',
          institution: null,
          startDate: '2023-01',
          endDate: null,
        },
      ]);

      const headings = screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent);
      expect(headings).toEqual(['Em curso', 'Concluído']);
    });
  });

  describe('partially filled entries', () => {
    it('renders the course alone rather than inventing an institution', () => {
      renderPage([
        {
          course: 'Sistemas de Informação',
          institution: null,
          startDate: null,
          endDate: null,
        },
      ]);

      expect(screen.getByText('Sistemas de Informação')).toBeVisible();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('omits the period rather than showing a dangling separator', () => {
      renderPage([
        {
          course: 'Curso',
          institution: 'Instituição',
          startDate: null,
          endDate: '2023-12',
        },
      ]);

      expect(screen.queryByText(/–/)).not.toBeInTheDocument();
    });
  });

  it('says so when there is nothing to list', () => {
    renderPage([]);

    // the list is the page here, so a bare heading would look like a failure
    // to load rather than an empty list
    expect(screen.getByText(messages.education.empty)).toBeVisible();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
