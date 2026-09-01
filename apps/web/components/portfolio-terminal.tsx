'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { profile } from '../content/profile';

type LineType = 'command' | 'output' | 'error' | 'welcome' | 'system';

interface OutputLine {
  id: string;
  type: LineType;
  text: string;
}

const COMMANDS = [
  '/help',
  '/sobre',
  '/stacks',
  '/formacao',
  '/links',
  '/clear',
];
const PROMPT = 'ljb@portfolio';

let _lineId = 0;

function line(type: LineType, ...texts: string[]): OutputLine[] {
  return texts.map((text) => ({
    id: String(++_lineId),
    type,
    text,
  }));
}

function processCommand(cmd: string): OutputLine[] | 'clear' {
  const c = cmd.trim().toLowerCase();

  if (c === '/help') {
    return [
      ...line('system', '─────────────────────────────'),
      ...line(
        'output',
        '  /sobre     → quem sou',
        '  /stacks    → tecnologias',
        '  /formacao  → educação',
        '  /links     → redes sociais',
        '  /clear     → limpar terminal',
      ),
      ...line('system', '─────────────────────────────'),
    ];
  }

  if (c === '/sobre') {
    return line(
      'output',
      'Luciano Borges — Full-Stack Dev',
      'Estudante de SI, 6º semestre.',
      'Dev na B2ML — arquitetura, segurança, backend.',
      'Foco em sistemas que sobrevivem ao crescimento.',
    );
  }

  if (c === '/stacks') {
    const by = (level: string) =>
      profile.skills
        .filter((s) => s.level === level)
        .map((s) => s.name)
        .join(' · ');
    return line(
      'output',
      `EXPERT  ${by('EXPERT')}`,
      `ADV     ${by('ADV')}`,
      `INT     ${by('INT')}`,
    );
  }

  if (c === '/formacao' || c === '/formação') {
    const entry = profile.education[0];
    if (!entry) return line('output', 'Nenhuma formação cadastrada.');
    const status = entry.endDate === null ? '● EM ANDAMENTO' : 'CONCLUÍDO';
    return line(
      'output',
      `${entry.course}`,
      `Status:      ${status}`,
      `Instituição: ${entry.institution ?? '—'}`,
      `Início:      ${entry.startDate ?? '—'}`,
    );
  }

  if (c === '/links') {
    return line(
      'output',
      `GitHub   ${profile.links.github ?? '—'}`,
      `LinkedIn ${profile.links.linkedin ?? '—'}`,
      `Email    ${profile.links.email ?? '—'}`,
    );
  }

  if (c === '/clear') return 'clear';

  return [
    ...line('error', `command not found: ${cmd}`),
    ...line('error', 'tente /help'),
  ];
}

// ── Mario idle animation ──────────────────────────────────────────────────────
//
// 5-row layout (rows 0-4):
//   row 0  sky  — Mario head when jumping
//   row 1  head — Mario head on ground / body when jumping
//   row 2  body — Mario body on ground / tucked legs when jumping
//   row 3  legs — Mario legs on ground (empty when jumping)
//   row 4  ─────  ground line
//
// Mario: 5-char wide  (o_o) head · /|M|\ body · /   \ legs
// Pipe:  3-char wide  [=] cap (row 1) · |=| body (rows 2-4)
// Jump trigger: pipe enters cols [0..14] → 15 frames ≈ 1.5 s air time.
// Mario rendered last on jump frames so he appears over the pipe.

const W = 36;
const MARIO_COL = 2;
const CYCLE = 44;

const M_HEAD = ['(', 'o', '_', 'o', ')'] as const;
const M_BODY = ['/', '|', 'M', '|', '\\'] as const;
const M_TUCK = [' ', '(', 'U', ')', ' '] as const;

function place(row: string[], chars: readonly string[], col: number) {
  chars.forEach((ch, i) => {
    row[col + i] = ch;
  });
}

function buildMarioFrame(tick: number): string[] {
  const pipeX = W - 4 - (tick % CYCLE);
  const jumping = pipeX >= 0 && pipeX <= 14;
  const legA = Math.floor(tick / 4) % 2 === 0;

  const rows: string[][] = [
    Array<string>(W).fill(' '),
    Array<string>(W).fill(' '),
    Array<string>(W).fill(' '),
    Array<string>(W).fill(' '),
    Array<string>(W).fill('─'),
  ];

  const mRow = jumping ? 0 : 1;

  // Mario — first pass
  place(rows[mRow], M_HEAD, MARIO_COL);
  place(rows[mRow + 1], M_BODY, MARIO_COL);
  if (jumping) {
    place(rows[mRow + 2], M_TUCK, MARIO_COL);
  } else {
    place(
      rows[3],
      legA ? ['/', ' ', ' ', ' ', '\\'] : ['\\', ' ', ' ', ' ', '/'],
      MARIO_COL,
    );
  }

  // Pipe
  if (pipeX >= 0 && pipeX + 2 < W) {
    place(rows[1], ['[', '=', ']'], pipeX);
    place(rows[2], ['|', '=', '|'], pipeX);
    place(rows[3], ['|', '=', '|'], pipeX);
    place(rows[4], ['|', '=', '|'], pipeX);
  }

  // Mario — second pass (appears in front of pipe on overlap frames)
  if (jumping) {
    place(rows[0], M_HEAD, MARIO_COL);
    place(rows[1], M_BODY, MARIO_COL);
    place(rows[2], M_TUCK, MARIO_COL);
  }

  return rows.map((r) => r.join(''));
}

function MarioIdle({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const frames = buildMarioFrame(0);
  return (
    <div ref={containerRef} aria-hidden="true" className="select-none py-2">
      {frames.map((row, i) => (
        <div
          key={i}
          data-row={i}
          className="whitespace-pre font-mono text-[11.5px] leading-[1.7] text-highlight-gold/40"
        >
          {row}
        </div>
      ))}
      <div className="mt-3 font-mono text-[10px] text-white/15">
        &gt; type /help to explore
      </div>
    </div>
  );
}

// ── Titlebar ──────────────────────────────────────────────────────────────────

interface Pos {
  x: number;
  y: number;
}

function Titlebar({
  onClose,
  onMinimize,
  draggable = false,
  onMouseDown,
}: {
  onClose: () => void;
  onMinimize: () => void;
  draggable?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={draggable ? onMouseDown : undefined}
      className={[
        'flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 select-none',
        'bg-gradient-to-b from-white/[0.07] to-transparent',
        draggable ? 'cursor-grab active:cursor-grabbing' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="size-3 rounded-full bg-[#ff5f57] transition-opacity hover:opacity-80 focus:outline-none"
      />
      <button
        type="button"
        onClick={onMinimize}
        aria-label="Minimizar"
        className="size-3 rounded-full bg-[#febc2e] transition-opacity hover:opacity-80 focus:outline-none"
      />
      <span aria-hidden className="size-3 rounded-full bg-[#28c840]/50" />

      <span className="mx-auto font-mono text-[10px] tracking-[0.18em] text-white/25 uppercase">
        portfolio.sh
      </span>

      <button
        type="button"
        onClick={onMinimize}
        aria-label="Minimizar terminal"
        className="rounded px-1.5 py-0.5 font-mono text-[10px] text-white/25 transition-colors hover:bg-white/10 hover:text-white/60"
      >
        ─
      </button>
    </div>
  );
}

// ── PortfolioTerminal ─────────────────────────────────────────────────────────

export function PortfolioTerminal({ inline = false }: { inline?: boolean }) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [animated, setAnimated] = useState(true);

  const termRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });
  const marioContainerRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef(0);

  // Mario animation — imperative DOM updates to avoid React re-renders
  useEffect(() => {
    if (!animated) return;
    tickRef.current = 0;
    const id = setInterval(() => {
      tickRef.current += 1;
      const container = marioContainerRef.current;
      if (!container) return;
      const frames = buildMarioFrame(tickRef.current);
      const rowEls = container.querySelectorAll('[data-row]');
      frames.forEach((text, i) => {
        if (rowEls[i]) rowEls[i].textContent = text;
      });
    }, 100);
    return () => clearInterval(id);
  }, [animated]);

  useEffect(() => {
    const el = termRef.current;
    if (!el || window.innerWidth < 768) return;
    setPos({ x: window.innerWidth - (el.offsetWidth || 340) - 24, y: 88 });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      setPos({
        x: drag.current.px + e.clientX - drag.current.sx,
        y: drag.current.py + e.clientY - drag.current.sy,
      });
    };
    const onUp = () => {
      drag.current.active = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      if (window.innerWidth < 768) return;
      drag.current = {
        active: true,
        sx: e.clientX,
        sy: e.clientY,
        px: pos?.x ?? window.innerWidth - 364,
        py: pos?.y ?? 88,
      };
      e.preventDefault();
    },
    [pos],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setCmdHistory((h) => [cmd, ...h]);
    setHistoryIdx(-1);
    setInput('');
    const result = processCommand(cmd);
    if (result === 'clear') {
      setLines([]);
      setAnimated(true);
      return;
    }
    setAnimated(false);
    setLines((prev) => [...prev, ...line('command', cmd), ...result]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setInput(cmdHistory[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : (cmdHistory[next] ?? ''));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = COMMANDS.find((c) => c.startsWith(input) && c !== input);
      if (match) setInput(match);
    }
  };

  const COLOR: Record<LineType, string> = {
    welcome: 'text-highlight-red font-semibold',
    system: 'text-white/20',
    command: 'text-highlight-gold',
    output: 'text-white/80',
    error: 'text-highlight-red/70',
  };

  const posStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, top: 88 };

  /* ── shared body ── */
  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11.5px] leading-[1.7] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {animated ? (
          <MarioIdle containerRef={marioContainerRef} />
        ) : (
          lines.map((l) => (
            <div key={l.id} className={COLOR[l.type]}>
              {l.type === 'command' ? (
                <>
                  <span className="text-highlight-green opacity-60">
                    {'> '}
                  </span>
                  {l.text}
                </>
              ) : (
                l.text
              )}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] px-4 py-2.5"
      >
        <span className="shrink-0 font-mono text-[10px] tracking-wide text-white/30 select-none">
          {PROMPT}
        </span>
        <span className="text-highlight-green font-mono text-[11px] select-none">
          $
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent font-mono text-[11.5px] text-white/90 outline-none placeholder:text-white/20"
          placeholder="comando..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Terminal input"
        />
      </form>
    </div>
  );

  /* ── mobile button ── */
  const mobileBtn = (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Abrir terminal"
      className="md:hidden fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-4 py-2 font-mono text-xs backdrop-blur-xl"
    >
      <span className="text-highlight-green" aria-hidden>
        {'>'}
      </span>
      <span className="text-white/70">_</span>
    </button>
  );

  /* ── mobile fullscreen ── */
  const mobileOverlay = mobileOpen && (
    <div
      role="dialog"
      aria-label="Terminal"
      aria-modal="true"
      className="md:hidden fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl"
    >
      <Titlebar
        onClose={() => setMobileOpen(false)}
        onMinimize={() => setMobileOpen(false)}
      />
      {body}
    </div>
  );

  /* ── desktop minimized pill ── */
  const pill = minimized && (
    <button
      type="button"
      onClick={() => setMinimized(false)}
      aria-label="Restaurar terminal"
      className={[
        'flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2',
        'font-mono text-[11px] text-white/60 backdrop-blur-xl shadow-lg hover:border-white/20 transition-colors',
        inline ? 'w-full justify-center' : 'hidden md:flex fixed z-40',
      ].join(' ')}
      style={inline ? undefined : posStyle}
    >
      <span className="text-highlight-red" aria-hidden>
        {'>'}
      </span>
      _ portfolio.sh
    </button>
  );

  /* ── desktop window ── */
  const windowEl = !minimized && (
    <div
      ref={termRef}
      className={[
        'flex flex-col rounded-xl border border-white/[0.08] bg-black/55',
        'shadow-[0_8px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl',
        inline ? 'w-full' : 'hidden md:flex fixed z-40 w-[340px]',
      ].join(' ')}
      style={{ height: 340, ...(inline ? {} : posStyle) }}
    >
      <Titlebar
        onClose={() => setMinimized(true)}
        onMinimize={() => setMinimized(true)}
        draggable={!inline}
        onMouseDown={startDrag}
      />
      {body}
    </div>
  );

  return (
    <>
      {mobileBtn}
      {mobileOverlay}
      {pill}
      {windowEl}
    </>
  );
}
