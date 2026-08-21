import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../../../messages/pt.json';
import ProjectNotFound from './not-found';

function renderNotFound() {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <ProjectNotFound />
    </NextIntlClientProvider>,
  );
}

describe('ProjectNotFound', () => {
  it('explains that the project was not found and links back to the listing', () => {
    renderNotFound();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: messages.projectDetail.notFoundTitle,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(messages.projectDetail.notFoundDescription),
    ).toBeVisible();

    const link = screen.getByRole('link', {
      name: messages.projectDetail.backToProjects,
    });
    expect(link).toHaveAttribute('href', '/pt/projetos');
  });
});
