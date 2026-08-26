import { render } from '@testing-library/react';
import gsap from 'gsap';
import { PinnedSection } from './pinned-section';

// Mock functions are created *inside* the factory, not referenced from
// outer `const`s: jest.mock is hoisted above module-level declarations, and
// pinned-section.tsx calls gsap.registerPlugin at module scope (not
// inside the component) -- so the mock has to be self-contained by the
// time that import runs, or it throws "Cannot access ... before
// initialization". Read the mocks back off the imported `gsap` module
// itself instead of a separate top-level variable.
jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    timeline: jest.fn(() => ({
      scrollTrigger: { kill: jest.fn() },
      kill: jest.fn(),
      revert: jest.fn(),
    })),
  },
}));

jest.mock('gsap/ScrollTrigger', () => ({
  __esModule: true,
  ScrollTrigger: {},
}));

const mockedGsap = gsap as unknown as {
  registerPlugin: jest.Mock;
  timeline: jest.Mock;
};

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
}

describe('PinnedSection', () => {
  beforeEach(() => {
    mockedGsap.timeline.mockClear();
    // registerPlugin is NOT cleared here: it runs once at module load
    // (top-level `if (typeof window !== 'undefined')` in
    // pinned-section.tsx), not per render -- Node only evaluates the
    // module once across this whole file, so it is only ever called on
    // whichever test happens to trigger the first import.
  });

  it('renders children inside the frame', () => {
    mockMatchMedia(false);
    const { getByText } = render(
      <PinnedSection>
        <p>conteúdo</p>
      </PinnedSection>,
    );

    expect(getByText('conteúdo')).toBeInTheDocument();
  });

  it('adds no decoration of its own, leaving all styling to the caller', () => {
    mockMatchMedia(false);
    const { container } = render(
      <PinnedSection>
        <p>conteúdo</p>
      </PinnedSection>,
    );

    // The red frame and its four corner markers were removed along with
    // the "Frame" in the old name -- this is a pure behaviour wrapper now,
    // so it must not smuggle decorative nodes back in.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });

  it('never calls gsap.timeline (so never pins) under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    render(
      <PinnedSection>
        <p>conteúdo</p>
      </PinnedSection>,
    );

    expect(mockedGsap.timeline).not.toHaveBeenCalled();
  });

  it('creates a pinned scroll-scrubbed timeline without the preference, and calls onSetup', () => {
    mockMatchMedia(false);
    const onSetup = jest.fn();
    render(
      <PinnedSection onSetup={onSetup}>
        <p>conteúdo</p>
      </PinnedSection>,
    );

    expect(mockedGsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({
          pin: true,
          scrub: 1,
        }),
      }),
    );

    expect(onSetup).toHaveBeenCalledWith(
      mockedGsap.timeline.mock.results[0].value,
      expect.any(HTMLDivElement),
    );
  });

  it('kills the ScrollTrigger and reverts the timeline on unmount, so route changes do not leak listeners or leave corrupted inline styles', () => {
    mockMatchMedia(false);
    const { unmount } = render(
      <PinnedSection>
        <p>conteúdo</p>
      </PinnedSection>,
    );

    const timelineInstance = mockedGsap.timeline.mock.results[0].value as {
      scrollTrigger: { kill: jest.Mock };
      revert: jest.Mock;
    };

    unmount();

    expect(timelineInstance.scrollTrigger.kill).toHaveBeenCalled();
    // .revert(), not .kill() (#135): killing a .from()-based tween leaves
    // its starting values as inline styles, which a remount's own .from()
    // then reads as the "natural" end state -- see pinned-section.tsx.
    expect(timelineInstance.revert).toHaveBeenCalled();
  });

  it('registers the ScrollTrigger plugin at module load', () => {
    // Not tied to this render specifically -- see the beforeEach note.
    // Asserts the module-level side effect happened at all, once, by the
    // time any test in this file has run.
    expect(mockedGsap.registerPlugin).toHaveBeenCalledWith(expect.anything());
  });
});
