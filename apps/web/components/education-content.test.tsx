import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { Education } from '../content/profile';
import messages from '../messages/pt.json';
import { EducationContent } from './education-content';

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      kill: jest.fn(),
      revert: jest.fn(),
      from: jest.fn().mockReturnThis(),
    })),
    set: jest.fn(),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function renderContent(education: Education[]) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <EducationContent education={education} />
    </NextIntlClientProvider>,
  );
}

describe('EducationContent', () => {
  it('shows the empty state message when there is no education entry', () => {
    renderContent([]);

    expect(screen.getByText(messages.education.empty)).toBeInTheDocument();
  });

  it('renders all entries, ongoing first in DOM order', () => {
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

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings[0]).toHaveTextContent('Curso em andamento');
    expect(headings[1]).toHaveTextContent('Antigo');

    // bento shows all entries simultaneously
    expect(screen.getByText('Instituição A')).toBeInTheDocument();
    expect(screen.getByText('Instituição B')).toBeInTheDocument();
  });

  it('shows the ongoing badge for an entry without an end date', () => {
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

  it('renders technologies for each entry', () => {
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

  it('shows the course heading even when institution is absent', () => {
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
});
