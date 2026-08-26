import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { Education } from '../content/profile';
import messages from '../messages/pt.json';
import { EducationContent } from './education-content';

function renderContent(education: Education[]) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <EducationContent education={education} />
    </NextIntlClientProvider>,
  );
}

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  Element.prototype.scrollIntoView = jest.fn();
});

describe('EducationContent', () => {
  it('shows the empty state message when there is no education entry', () => {
    renderContent([]);

    expect(screen.getByText(messages.education.empty)).toBeInTheDocument();
  });

  it('sorts ongoing entries first, then by start date descending', () => {
    renderContent([
      {
        course: 'Antigo',
        institution: 'Instituição A',
        startDate: '2018-01-01',
        endDate: '2020-01-01',
        technologies: [],
      },
      {
        course: 'Curso em andamento',
        institution: 'Instituição B',
        startDate: '2023-01-01',
        endDate: null,
        technologies: [],
      },
    ]);

    // ongoing entry sorts first, so it is the initial active card
    expect(
      screen.getByRole('heading', { name: 'Curso em andamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Instituição B')).toBeInTheDocument();
    // the older entry is only present as a node label, not its full card
    expect(screen.queryByText('Instituição A')).not.toBeInTheDocument();
  });

  it('shows the ongoing badge for an entry without an end date or start date', () => {
    renderContent([
      {
        course: 'Sem datas',
        institution: 'Instituição',
        startDate: null,
        endDate: null,
        technologies: [],
      },
    ]);

    expect(screen.getByText(messages.education.ongoing)).toBeInTheDocument();
  });

  it('renders technologies for the active entry', () => {
    renderContent([
      {
        course: 'Curso',
        institution: 'Instituição',
        startDate: '2022-01-01',
        endDate: '2024-01-01',
        technologies: ['TypeScript', 'React'],
      },
    ]);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('omits the institution line when the entry has none', () => {
    renderContent([
      {
        course: 'Curso sem instituição',
        institution: null,
        startDate: '2022-01-01',
        endDate: '2024-01-01',
        technologies: [],
      },
    ]);

    expect(
      screen.getByRole('heading', { name: 'Curso sem instituição' }),
    ).toBeInTheDocument();
  });

  it('switches the active card when a different node is clicked', async () => {
    const user = userEvent.setup();
    renderContent([
      {
        course: 'Primeiro curso',
        institution: 'Instituição 1',
        startDate: '2023-01-01',
        endDate: null,
        technologies: [],
      },
      {
        course: 'Segundo curso',
        institution: 'Instituição 2',
        startDate: '2018-01-01',
        endDate: '2020-01-01',
        technologies: [],
      },
    ]);

    await user.click(screen.getByRole('button', { name: 'Segundo curso' }));

    expect(screen.getByText('Instituição 2')).toBeInTheDocument();
  });
});
