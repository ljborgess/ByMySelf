'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'portfolio-intro-seen';
const PX = 8; // pixel block size in SVG units
const DASH = 320;

type Pt = [number, number]; // [col, row]

// ── pixel art data ────────────────────────────────────────────────────────────
// Grid: 28 cols (0-27) × 21 rows (0-20).
// Center col ≈ 14. PX=8, gap=1. SVG viewBox "0 0 224 168".
// Duotone: face = gold/28%, hair+glasses+mustache = gold/100%.
//
// Key proportions from reference photo:
//   - Curly hair: irregular top silhouette (gaps = curl bumps)
//   - Glasses: large rectangular frames spanning ~75% of face width
//   - Mustache: thick, centered, 4 rows deep
//   - Right lens 1 col wider than left (photo perspective)

const HAIR: Pt[] = [
  // row 0 — bumpy top (gaps at 14 simulate curl dip)
  [12, 0],
  [13, 0],
  [15, 0],
  [16, 0],
  [17, 0],
  // row 1
  [10, 1],
  [11, 1],
  [12, 1],
  [13, 1],
  [14, 1],
  [15, 1],
  [16, 1],
  [17, 1],
  [18, 1],
  // row 2
  [8, 2],
  [9, 2],
  [10, 2],
  [11, 2],
  [12, 2],
  [13, 2],
  [14, 2],
  [15, 2],
  [16, 2],
  [17, 2],
  [18, 2],
  [19, 2],
  // row 3
  [7, 3],
  [8, 3],
  [9, 3],
  [10, 3],
  [11, 3],
  [12, 3],
  [13, 3],
  [14, 3],
  [15, 3],
  [16, 3],
  [17, 3],
  [18, 3],
  [19, 3],
  [20, 3],
  // row 4
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
  [16, 4],
  [17, 4],
  [18, 4],
  [19, 4],
  [20, 4],
  [21, 4],
  // row 5 — sideburns only, face starts in the center
  [6, 5],
  [7, 5],
  [20, 5],
  [21, 5],
];

const FACE: Pt[] = [
  // row 5 inner (between sideburns)
  [8, 5],
  [9, 5],
  [10, 5],
  [11, 5],
  [12, 5],
  [13, 5],
  [14, 5],
  [15, 5],
  [16, 5],
  [17, 5],
  [18, 5],
  [19, 5],
  // row 6
  [7, 6],
  [8, 6],
  [9, 6],
  [10, 6],
  [11, 6],
  [12, 6],
  [13, 6],
  [14, 6],
  [15, 6],
  [16, 6],
  [17, 6],
  [18, 6],
  [19, 6],
  [20, 6],
  // rows 7-16 — full width
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
  [16, 7],
  [17, 7],
  [18, 7],
  [19, 7],
  [20, 7],
  [21, 7],
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
  [16, 8],
  [17, 8],
  [18, 8],
  [19, 8],
  [20, 8],
  [21, 8],
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
  [16, 9],
  [17, 9],
  [18, 9],
  [19, 9],
  [20, 9],
  [21, 9],
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
  [16, 10],
  [17, 10],
  [18, 10],
  [19, 10],
  [20, 10],
  [21, 10],
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
  [16, 11],
  [17, 11],
  [18, 11],
  [19, 11],
  [20, 11],
  [21, 11],
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
  [16, 12],
  [17, 12],
  [18, 12],
  [19, 12],
  [20, 12],
  [21, 12],
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
  [16, 13],
  [17, 13],
  [18, 13],
  [19, 13],
  [20, 13],
  [21, 13],
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
  [16, 14],
  [17, 14],
  [18, 14],
  [19, 14],
  [20, 14],
  [21, 14],
  [6, 15],
  [7, 15],
  [8, 15],
  [9, 15],
  [10, 15],
  [11, 15],
  [12, 15],
  [13, 15],
  [14, 15],
  [15, 15],
  [16, 15],
  [17, 15],
  [18, 15],
  [19, 15],
  [20, 15],
  [21, 15],
  [6, 16],
  [7, 16],
  [8, 16],
  [9, 16],
  [10, 16],
  [11, 16],
  [12, 16],
  [13, 16],
  [14, 16],
  [15, 16],
  [16, 16],
  [17, 16],
  [18, 16],
  [19, 16],
  [20, 16],
  [21, 16],
  // narrowing chin
  [7, 17],
  [8, 17],
  [9, 17],
  [10, 17],
  [11, 17],
  [12, 17],
  [13, 17],
  [14, 17],
  [15, 17],
  [16, 17],
  [17, 17],
  [18, 17],
  [19, 17],
  [20, 17],
  [8, 18],
  [9, 18],
  [10, 18],
  [11, 18],
  [12, 18],
  [13, 18],
  [14, 18],
  [15, 18],
  [16, 18],
  [17, 18],
  [18, 18],
  [19, 18],
  [9, 19],
  [10, 19],
  [11, 19],
  [12, 19],
  [13, 19],
  [14, 19],
  [15, 19],
  [16, 19],
  [17, 19],
  [18, 19],
  [11, 20],
  [12, 20],
  [13, 20],
  [14, 20],
  [15, 20],
  [16, 20],
];

const GLASSES: Pt[] = [
  // ── left lens (cols 6-12, rows 7-11) ──
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
  [10, 7],
  [11, 7],
  [12, 7], // top
  [6, 8],
  [12, 8], // sides
  [6, 9],
  [12, 9],
  [6, 10],
  [12, 10],
  [6, 11],
  [7, 11],
  [8, 11],
  [9, 11],
  [10, 11],
  [11, 11],
  [12, 11], // bottom
  // ── bridge ──
  [13, 8],
  [13, 9],
  [13, 10],
  // ── right lens (cols 14-21, rows 7-11) — 1 col wider ──
  [14, 7],
  [15, 7],
  [16, 7],
  [17, 7],
  [18, 7],
  [19, 7],
  [20, 7],
  [21, 7], // top
  [14, 8],
  [21, 8],
  [14, 9],
  [21, 9],
  [14, 10],
  [21, 10],
  [14, 11],
  [15, 11],
  [16, 11],
  [17, 11],
  [18, 11],
  [19, 11],
  [20, 11],
  [21, 11], // bottom
  // ── left temple ──
  [3, 8],
  [4, 8],
  [5, 8],
  [3, 9],
  [4, 9],
  [5, 9],
  [3, 10],
  [4, 10],
  [5, 10],
  // ── right temple ──
  [22, 8],
  [23, 8],
  [24, 8],
  [22, 9],
  [23, 9],
  [24, 9],
  [22, 10],
  [23, 10],
  [24, 10],
];

const MUSTACHE: Pt[] = [
  // 4 rows deep, tapers top and bottom
  [11, 14],
  [12, 14],
  [13, 14],
  [14, 14],
  [15, 14],
  [16, 14],
  [10, 15],
  [11, 15],
  [12, 15],
  [13, 15],
  [14, 15],
  [15, 15],
  [16, 15],
  [17, 15],
  [11, 16],
  [12, 16],
  [13, 16],
  [14, 16],
  [15, 16],
  [16, 16],
  [12, 17],
  [13, 17],
  [14, 17],
  [15, 17],
];

// ── helper ────────────────────────────────────────────────────────────────────

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

    tl.to(Array.from(face.children), {
      opacity: 1,
      stagger: 0.003,
      duration: 0.12,
    })
      .to(
        Array.from(hair.children),
        {
          opacity: 1,
          stagger: 0.01,
          duration: 0.12,
        },
        0.1,
      )
      .to(
        Array.from(glasses.children),
        {
          opacity: 1,
          stagger: 0.018,
          duration: 0.15,
        },
        0.25,
      )
      .to(
        Array.from(mustache.children),
        {
          opacity: 1,
          stagger: 0.035,
          duration: 0.15,
        },
        0.58,
      )
      .set(text, { strokeDasharray: DASH, strokeDashoffset: DASH })
      .to(
        text,
        { strokeDashoffset: 0, duration: 0.85, ease: 'power1.inOut' },
        0.78,
      )
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
      <svg viewBox="0 0 224 168" width={196} height={147} aria-hidden="true">
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
