'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'portfolio-intro-seen';
const PX = 9; // pixel block size in SVG units
const DASH = 320;

type Pt = [number, number]; // [col, row]

// ── pixel art data ────────────────────────────────────────────────────────────
// Grid: 20 cols (0-19) × 19 rows (0-18). Each block = PX × PX, 1px gap.
// Duotone: face = gold/30%, hair+glasses+mustache = gold/100%.

const HAIR: Pt[] = [
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
  [6, 1],
  [7, 1],
  [8, 1],
  [9, 1],
  [10, 1],
  [11, 1],
  [12, 1],
  [13, 1],
  [5, 2],
  [6, 2],
  [7, 2],
  [8, 2],
  [9, 2],
  [10, 2],
  [11, 2],
  [12, 2],
  [13, 2],
  [14, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
  [9, 3],
  [10, 3],
  [11, 3],
  [12, 3],
  [13, 3],
  [14, 3],
  [15, 3],
  [4, 4],
  [5, 4],
  [6, 4],
  [7, 4],
  [8, 4],
  [9, 4],
  [10, 4],
  [11, 4],
  [12, 4],
  [13, 4],
  [14, 4],
  [15, 4],
  [4, 5],
  [5, 5],
  [14, 5],
  [15, 5], // sideburns
];

const FACE: Pt[] = [
  [6, 5],
  [7, 5],
  [8, 5],
  [9, 5],
  [10, 5],
  [11, 5],
  [12, 5],
  [13, 5],
  [5, 6],
  [6, 6],
  [7, 6],
  [8, 6],
  [9, 6],
  [10, 6],
  [11, 6],
  [12, 6],
  [13, 6],
  [14, 6],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
  [10, 7],
  [11, 7],
  [12, 7],
  [13, 7],
  [14, 7],
  [15, 7],
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [15, 8],
  [4, 9],
  [5, 9],
  [6, 9],
  [7, 9],
  [8, 9],
  [9, 9],
  [10, 9],
  [11, 9],
  [12, 9],
  [13, 9],
  [14, 9],
  [15, 9],
  [4, 10],
  [5, 10],
  [6, 10],
  [7, 10],
  [8, 10],
  [9, 10],
  [10, 10],
  [11, 10],
  [12, 10],
  [13, 10],
  [14, 10],
  [15, 10],
  [4, 11],
  [5, 11],
  [6, 11],
  [7, 11],
  [8, 11],
  [9, 11],
  [10, 11],
  [11, 11],
  [12, 11],
  [13, 11],
  [14, 11],
  [15, 11],
  [4, 12],
  [5, 12],
  [6, 12],
  [7, 12],
  [8, 12],
  [9, 12],
  [10, 12],
  [11, 12],
  [12, 12],
  [13, 12],
  [14, 12],
  [15, 12],
  [4, 13],
  [5, 13],
  [6, 13],
  [7, 13],
  [8, 13],
  [9, 13],
  [10, 13],
  [11, 13],
  [12, 13],
  [13, 13],
  [14, 13],
  [15, 13],
  [4, 14],
  [5, 14],
  [6, 14],
  [7, 14],
  [8, 14],
  [9, 14],
  [10, 14],
  [11, 14],
  [12, 14],
  [13, 14],
  [14, 14],
  [15, 14],
  [5, 15],
  [6, 15],
  [7, 15],
  [8, 15],
  [9, 15],
  [10, 15],
  [11, 15],
  [12, 15],
  [13, 15],
  [14, 15],
  [6, 16],
  [7, 16],
  [8, 16],
  [9, 16],
  [10, 16],
  [11, 16],
  [12, 16],
  [13, 16],
  [7, 17],
  [8, 17],
  [9, 17],
  [10, 17],
  [11, 17],
  [12, 17],
  [8, 18],
  [9, 18],
  [10, 18],
  [11, 18],
];

const GLASSES: Pt[] = [
  // left lens
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
  [8, 7],
  [4, 8],
  [8, 8],
  [4, 9],
  [8, 9],
  [4, 10],
  [5, 10],
  [6, 10],
  [7, 10],
  [8, 10],
  // bridge
  [9, 8],
  [9, 9],
  // right lens
  [10, 7],
  [11, 7],
  [12, 7],
  [13, 7],
  [14, 7],
  [15, 7],
  [10, 8],
  [15, 8],
  [10, 9],
  [15, 9],
  [10, 10],
  [11, 10],
  [12, 10],
  [13, 10],
  [14, 10],
  [15, 10],
  // temples
  [2, 8],
  [3, 8],
  [2, 9],
  [3, 9],
  [16, 8],
  [17, 8],
  [16, 9],
  [17, 9],
];

const MUSTACHE: Pt[] = [
  [8, 13],
  [9, 13],
  [10, 13],
  [11, 13],
  [7, 14],
  [8, 14],
  [9, 14],
  [10, 14],
  [11, 14],
  [12, 14],
  [8, 15],
  [9, 15],
  [10, 15],
  [11, 15],
];

// ── helper (module scope — not a dynamic component) ───────────────────────────

function PixelGroup({
  pts,
  fill,
  fillOpacity,
  groupRef,
}: {
  pts: Pt[];
  fill: string;
  fillOpacity: number;
  groupRef: React.Ref<SVGGElement>;
}) {
  return (
    <g ref={groupRef}>
      {pts.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * PX}
          y={r * PX}
          width={PX - 1}
          height={PX - 1}
          fill={fill}
          fillOpacity={fillOpacity}
          opacity={0}
        />
      ))}
    </g>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export function IntroLoader() {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const faceRef = useRef<SVGGElement>(null);
  const hairRef = useRef<SVGGElement>(null);
  const glassesRef = useRef<SVGGElement>(null);
  const mustacheRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      /* sessionStorage unavailable — treat as unseen */
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (alreadySeen || prefersReducedMotion) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const face = faceRef.current;
    const hair = hairRef.current;
    const glasses = glassesRef.current;
    const mustache = mustacheRef.current;
    const text = textRef.current;
    const container = containerRef.current;
    if (!face || !hair || !glasses || !mustache || !text || !container) return;

    const markSeenAndHide = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        /* ok */
      }
      setVisible(false);
    };

    const tl = gsap.timeline({ onComplete: markSeenAndHide });

    tl
      // face skin (dim gold, all pixels at once with fast stagger)
      .to(Array.from(face.children), {
        opacity: 1,
        stagger: 0.003,
        duration: 0.12,
      })
      // hair (overlapping with face start)
      .to(
        Array.from(hair.children),
        {
          opacity: 1,
          stagger: 0.01,
          duration: 0.12,
        },
        0.1,
      )
      // glasses pixels render one by one
      .to(
        Array.from(glasses.children),
        {
          opacity: 1,
          stagger: 0.018,
          duration: 0.15,
        },
        0.25,
      )
      // mustache last
      .to(
        Array.from(mustache.children),
        {
          opacity: 1,
          stagger: 0.035,
          duration: 0.15,
        },
        0.58,
      )
      // "Hello" draws in via stroke-dashoffset
      .set(text, { strokeDasharray: DASH, strokeDashoffset: DASH })
      .to(
        text,
        { strokeDashoffset: 0, duration: 0.85, ease: 'power1.inOut' },
        0.78,
      )
      // fade out the whole screen
      .to(container, { opacity: 0, duration: 0.5 }, '+=0.4');

    return () => {
      tl.revert();
    };
  }, [visible]);

  if (!visible) return null;

  const GOLD = '#f59e0b';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="bg-background fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
    >
      {/* ── pixel art mascot ── */}
      <svg
        viewBox={`0 0 ${20 * PX} ${19 * PX}`}
        width={180}
        height={171}
        aria-hidden="true"
      >
        <PixelGroup
          pts={FACE}
          fill={GOLD}
          fillOpacity={0.28}
          groupRef={faceRef}
        />
        <PixelGroup pts={HAIR} fill={GOLD} fillOpacity={1} groupRef={hairRef} />
        <PixelGroup
          pts={GLASSES}
          fill={GOLD}
          fillOpacity={1}
          groupRef={glassesRef}
        />
        <PixelGroup
          pts={MUSTACHE}
          fill={GOLD}
          fillOpacity={1}
          groupRef={mustacheRef}
        />
      </svg>

      {/* ── "Hello" drawn in script stroke ── */}
      <svg viewBox="0 0 280 80" className="w-44 sm:w-56" aria-hidden="true">
        <text
          ref={textRef}
          x="50%"
          y="55%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-script fill-none"
          stroke="currentColor"
          strokeWidth="1.2"
          fontSize="64"
        >
          Hello
        </text>
      </svg>
    </div>
  );
}
