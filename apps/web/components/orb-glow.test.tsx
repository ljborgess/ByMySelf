import { render } from '@testing-library/react';
import { OrbGlow } from './orb-glow';

describe('OrbGlow', () => {
  it('is decorative, hidden from the accessibility tree', () => {
    const { container } = render(<OrbGlow />);
    const orb = container.firstElementChild;

    expect(orb).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the orb-glow class that carries the CSS animation and its prefers-reduced-motion fallback', () => {
    const { container } = render(<OrbGlow />);

    expect(container.firstElementChild).toHaveClass('orb-glow');
  });

  it('accepts an extra className without dropping the base ones', () => {
    const { container } = render(<OrbGlow className="mx-auto" />);

    expect(container.firstElementChild).toHaveClass('orb-glow', 'mx-auto');
  });
});
