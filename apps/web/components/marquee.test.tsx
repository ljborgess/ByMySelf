import { render } from '@testing-library/react';
import { Marquee } from './marquee';

describe('Marquee', () => {
  it('renders nothing with no items', () => {
    const { container } = render(<Marquee items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('repeats the items enough to never leave a visible gap, and duplicates the whole lap for a seamless loop', () => {
    const { getAllByText } = render(
      <Marquee items={['NestJS', 'Next.js']} laps={3} />,
    );

    // 3 laps x 2 items x 2 (duplicated for the seamless -50% loop) = 12
    // total, 6 occurrences of each distinct item.
    expect(getAllByText('NestJS')).toHaveLength(6);
    expect(getAllByText('Next.js')).toHaveLength(6);
  });

  it('applies the rotation transform for the diagonal footer variant', () => {
    const { container } = render(
      <Marquee items={['TypeScript']} rotateDeg={-6} />,
    );

    expect(container.firstElementChild).toHaveStyle({
      transform: 'rotate(-6deg)',
    });
  });

  it('has no rotation by default', () => {
    const { container } = render(<Marquee items={['TypeScript']} />);

    expect(container.firstElementChild).not.toHaveAttribute('style');
  });

  it('reverses the animation direction when asked to', () => {
    const { container } = render(<Marquee items={['TypeScript']} reverse />);

    const track = container.querySelector('.marquee-track');
    expect(track).toHaveStyle({ animationDirection: 'reverse' });
  });

  it('marks the separator glyphs as decorative', () => {
    const { container } = render(<Marquee items={['TypeScript']} />);

    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('hides the whole thing from the accessibility tree -- repeated text adds nothing a screen reader user does not already have', () => {
    const { container } = render(<Marquee items={['TypeScript']} />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
