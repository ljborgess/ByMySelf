import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/pt.json';
import { HorizontalTimeline } from './horizontal-timeline';

interface Item {
  id: string;
  title: string;
  detail: string;
}

const items: Item[] = [
  { id: '1', title: 'Primeiro', detail: 'Detalhe do primeiro' },
  { id: '2', title: 'Segundo', detail: 'Detalhe do segundo' },
  { id: '3', title: 'Terceiro', detail: 'Detalhe do terceiro' },
];

function renderTimeline(list: Item[] = items) {
  return render(
    <NextIntlClientProvider locale="pt" messages={messages}>
      <HorizontalTimeline
        items={list}
        getKey={(item) => item.id}
        ariaLabel="Linha do tempo"
        renderNode={(item) => item.title}
        renderCard={(item) => <p>{item.detail}</p>}
      />
    </NextIntlClientProvider>,
  );
}

beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = jest.fn();
});

describe('HorizontalTimeline', () => {
  it('renders nothing with no items', () => {
    const { container } = renderTimeline([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one node per item', () => {
    renderTimeline();

    for (const item of items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('starts with the first item active, showing its full card', () => {
    renderTimeline();

    expect(screen.getByText('Detalhe do primeiro')).toBeInTheDocument();
    expect(screen.queryByText('Detalhe do segundo')).not.toBeInTheDocument();
  });

  it('switches the card when a different node is clicked', async () => {
    const user = userEvent.setup();
    renderTimeline();

    await user.click(screen.getByRole('button', { name: 'Segundo' }));

    expect(screen.getByText('Detalhe do segundo')).toBeInTheDocument();
    expect(screen.queryByText('Detalhe do primeiro')).not.toBeInTheDocument();
  });

  it('marks the active node with aria-current', async () => {
    const user = userEvent.setup();
    renderTimeline();

    const first = screen.getByRole('button', { name: 'Primeiro' });
    const second = screen.getByRole('button', { name: 'Segundo' });

    expect(first).toHaveAttribute('aria-current', 'true');
    expect(second).toHaveAttribute('aria-current', 'false');

    await user.click(second);

    expect(first).toHaveAttribute('aria-current', 'false');
    expect(second).toHaveAttribute('aria-current', 'true');
  });

  it('advances with the next button and disables it at the last item', async () => {
    const user = userEvent.setup();
    renderTimeline();

    const next = screen.getByRole('button', { name: 'Próximo item' });

    await user.click(next);
    expect(screen.getByText('Detalhe do segundo')).toBeInTheDocument();

    await user.click(next);
    expect(screen.getByText('Detalhe do terceiro')).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it('disables the previous button at the first item', () => {
    renderTimeline();

    expect(
      screen.getByRole('button', { name: 'Item anterior' }),
    ).toBeDisabled();
  });

  it('exposes the group as a labelled timeline landmark', () => {
    renderTimeline();

    expect(
      screen.getByRole('group', { name: 'Linha do tempo' }),
    ).toBeInTheDocument();
  });
});
