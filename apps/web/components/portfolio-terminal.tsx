'use client';

import { useEffect, useRef, useState } from 'react';
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
    ...line('error', `comando não encontrado: ${cmd}`),
    ...line('error', 'tente /help'),
  ];
}

// ── Idle animation: a robot jumping server racks ─────────────────────────────
//
// Personagem próprio. Antes era o Mario pulando um cano -- personagem e
// cenário de um jogo de terceiro, num site que é vitrine profissional.
//
// 5-row layout (rows 0-4):
//   row 0  sky  — robot head when jumping
//   row 1  head — robot head on ground / body when jumping
//   row 2  body — robot body on ground / tucked legs when jumping
//   row 3  legs — robot legs on ground (empty when jumping)
//   row 4  ─────  ground line
//
// Robot: 5-char wide  [o_o] head · /|#|\ body · /   \ legs
// Rack:  3-char wide  ┌─┐ top (row 1) · │▪│ body (rows 2-4)
// Jump trigger: rack enters cols [0..14] → 15 frames ≈ 1.5 s air time.
// Robot rendered last on jump frames so it appears over the rack.

const W = 36;
const MARIO_COL = 2;
const CYCLE = 44;

const M_HEAD = ['[', 'o', '_', 'o', ']'] as const;
const M_BODY = ['/', '|', '#', '|', '\\'] as const;
const M_TUCK = [' ', '(', '_', ')', ' '] as const;

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
    place(rows[1], ['┌', '─', '┐'], pipeX);
    place(rows[2], ['│', '▪', '│'], pipeX);
    place(rows[3], ['│', '▪', '│'], pipeX);
    place(rows[4], ['┴', '─', '┴'], pipeX);
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
    <div ref={containerRef} aria-hidden="true" className="py-2 select-none">
      {frames.map((row, i) => (
        <div
          key={i}
          data-row={i}
          className="text-highlight-gold/40 font-mono text-xs leading-[1.7] whitespace-pre"
        >
          {row}
        </div>
      ))}
      {/* instrução, não ornamento: precisa passar AA (white/15 dava ~1.4:1) */}
      <div className="mt-3 font-mono text-xs text-white/55">
        &gt; digite /help para explorar
      </div>
    </div>
  );
}

// ── Titlebar ──────────────────────────────────────────────────────────────────

/*
 * Os "semáforos" são pontos de 12px, mas o alvo de toque é o botão de 24px
 * em volta (WCAG 2.5.8) -- e o foco usa o anel global de :focus-visible em
 * vez do `focus:outline-none` que deixava o teclado sem indicador nenhum.
 */
function TrafficLight({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group grid size-6 place-items-center rounded-full"
    >
      <span
        className={`size-3 rounded-full ${color} transition-opacity group-hover:opacity-80`}
      />
    </button>
  );
}

function Titlebar({
  onClose,
  onMinimize,
}: {
  onClose: () => void;
  onMinimize: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.07] to-transparent px-2 py-1.5 select-none">
      <TrafficLight label="Fechar" color="bg-[#ff5f57]" onClick={onClose} />
      <TrafficLight
        label="Minimizar"
        color="bg-[#febc2e]"
        onClick={onMinimize}
      />
      <span
        aria-hidden
        className="mx-1.5 size-3 rounded-full bg-[#28c840]/50"
      />

      <span className="mx-auto pr-14 font-mono text-xs tracking-[0.18em] text-white/55 uppercase">
        portfolio.sh
      </span>
    </div>
  );
}

// ── PortfolioTerminal ─────────────────────────────────────────────────────────

/*
 * Desktop (md+): janela embutida na coluna direita do hero, minimizável.
 * Mobile: a janela some e um botão flutuante abre o terminal em tela cheia.
 *
 * Existia também um modo flutuante arrastável (`inline={false}`), mas nada o
 * usava -- saiu junto com o estado de posição/arrasto que só ele lia.
 */
export function PortfolioTerminal() {
  const [minimized, setMinimized] = useState(false);
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [animated, setAnimated] = useState(true);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const marioContainerRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef(0);

  // Mario animation — imperative DOM updates to avoid React re-renders.
  // Quem pediu menos movimento fica com o quadro parado: este loop de 10
  // quadros/s era a única animação do site que ignorava a preferência.
  useEffect(() => {
    if (!animated || minimized) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  }, [animated, minimized]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Tela cheia no celular é um diálogo modal: Esc fecha e o foco entra no
  // campo ao abrir, senão o teclado ficava atrás do overlay.
  useEffect(() => {
    if (!mobileOpen) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

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
      // Só captura o Tab quando há o que completar -- antes ele era engolido
      // sempre, e o foco do teclado ficava preso no campo (WCAG 2.1.2).
      const match = COMMANDS.find((c) => c.startsWith(input) && c !== input);
      if (input && match) {
        e.preventDefault();
        setInput(match);
      }
    }
  };

  // Todas passam AA sobre o fundo do terminal; white/20 e red/70 não passavam.
  const COLOR: Record<LineType, string> = {
    welcome: 'text-highlight-red font-semibold',
    system: 'text-white/40',
    command: 'text-highlight-gold',
    output: 'text-white/80',
    error: 'text-highlight-red',
  };

  /* ── shared body ── */
  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-[1.7] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {animated ? (
          <MarioIdle containerRef={marioContainerRef} />
        ) : (
          lines.map((l) => (
            <div key={l.id} className={COLOR[l.type]}>
              {l.type === 'command' ? (
                <>
                  <span className="text-highlight-green">{'> '}</span>
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
        className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] px-4 py-2.5 focus-within:border-white/25"
      >
        <span className="shrink-0 font-mono text-xs tracking-wide text-white/55 select-none">
          {PROMPT}
        </span>
        <span className="text-highlight-green font-mono text-xs select-none">
          $
        </span>
        {/* sem anel no input: a borda do form acende (focus-within) e o
            caret vermelho já marca o campo -- um retângulo vermelho em
            volta de uma linha de terminal quebraria a metáfora */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="caret-highlight-red min-w-0 flex-1 bg-transparent font-mono text-xs text-white/90 outline-none placeholder:text-white/50"
          placeholder="comando..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Comando do terminal"
        />
      </form>
    </div>
  );

  return (
    <>
      {/* ── mobile: botão flutuante ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir terminal"
        className="fixed right-6 bottom-6 z-40 flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-4 font-mono text-xs backdrop-blur-xl md:hidden"
      >
        <span className="text-highlight-green" aria-hidden>
          {'>'}
        </span>
        <span className="text-white/70" aria-hidden>
          _
        </span>
      </button>

      {/* ── mobile: tela cheia ── */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-label="Terminal"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl md:hidden"
        >
          <Titlebar
            onClose={() => setMobileOpen(false)}
            onMinimize={() => setMobileOpen(false)}
          />
          {body}
        </div>
      )}

      {/* ── desktop ── sem box-shadow: No-Shadow Rule (DESIGN.md) */}
      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Restaurar terminal"
          className="hidden min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 font-mono text-xs text-white/70 backdrop-blur-xl transition-colors hover:border-white/30 md:flex"
        >
          <span className="text-highlight-red" aria-hidden>
            {'>'}
          </span>
          _ portfolio.sh
        </button>
      ) : (
        <div className="hidden h-[340px] w-full flex-col rounded-xl border border-white/10 bg-black/55 backdrop-blur-2xl md:flex">
          <Titlebar
            onClose={() => setMinimized(true)}
            onMinimize={() => setMinimized(true)}
          />
          {body}
        </div>
      )}
    </>
  );
}
