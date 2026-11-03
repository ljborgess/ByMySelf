---
name: ByMySelf
description: Portfólio full-stack dark e técnico — estética de terminal, rótulos monoespaçados, vermelho como tinta de anotação e uma assinatura à mão como contraponto.
colors:
  near-black-ink: "#0a0a0a"
  soft-graphite: "#cccccc"
  annotation-red: "#ef4444"
  marker-gold: "#f59e0b"
  signal-green: "#22c55e"
  ticker-lime: "#a3e635"
  accent: "{colors.annotation-red}"
  inverse-surface: "#ffffff"
  inverse-text: "#000000"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  quote-italic:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.875rem, 5vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  script:
    fontFamily: "Dancing Script, cursive"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.15em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.soft-graphite}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-outline-hover:
    textColor: "{colors.accent}"
  button-icon:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "{colors.annotation-red}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.full}"
    size: "44px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.soft-graphite}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card:
    backgroundColor: "transparent"
    rounded: "{rounded.lg}"
    padding: "20px"
  terminal-window:
    backgroundColor: "#0000008c"
    rounded: "{rounded.xl}"
    height: "340px"
---

# Design System: ByMySelf

## Overview

**Creative North Star: "The Developer's Console, Signed by Hand"**

The site reads as a developer's working console that a person has signed. At rest it is disciplined: a solid black ground, one desaturated body color, hairline white-opacity borders, wide-tracked monospace callouts, and a hero that behaves like a terminal — a green status line, a `>` prompt with a rotating headline and a blinking block cursor, and a real, typeable terminal window beside it. Then, deliberately, the discipline breaks: a headline sets a black-weight clause against an italic-serif one inside the same quote, the name signs off in cursive script, and the very first thing a visitor sees is a gold pixel-art portrait assembling itself while "Hello" is hand-drawn stroke by stroke. Console precision versus a human signature *is* the system — neither carries the page alone.

Accent colors exist as signals, not as a brand palette: red is the annotation and interaction ink, green means "live / ongoing / prompt," gold belongs to the playful pixel-and-terminal layer, lime is the ticker's beat mark. Depth never comes from a shadow — it comes from border-opacity steps (white at 10–30%) and from light: a blurred glow that answers hover and focus.

**Key Characteristics:**
- Dark-only, solid black ground (`#0a0a0a`) — no gradient, no aurora glow (a prior direction, explicitly retired).
- Terminal grammar as the hero's voice: status line, prompt, cursor, an interactive console window.
- Scroll-pinned reveals: content sections pin under the floating header while a scrubbed GSAP timeline reveals them; reduced motion removes the pin entirely.
- Flat by default. No `box-shadow` anywhere; depth is border-opacity, feedback is light (Signal Glow).
- Monospace, wide-tracked, uppercase labels wherever something reads as a technical callout (nav, eyebrows, skill levels).
- One deliberate rule-break: black-weight sans + italic serif inside one quote, and a cursive signature.

## Colors

A near-black ground, one gray for text, and four signal colors whose jobs are narrow and named. All four pass WCAG AA (4.5:1) against the background.

### Primary
- **Annotation Red** (`annotation-red`, 5.26:1 on background): the interaction and annotation ink. Eyebrow labels ("Foco principal", "Quem sou"), the nav underline and current-page color, hover borders/text on cards and outline pills, the solid fill of icon circles on hover (scroll hint, back-to-top) with black glyphs on top, the scroll-progress fill, the terminal's caret and focus treatments, the global focus ring and text selection. `--accent` is an alias of this color.

### Secondary
- **Marker Gold** (`marker-gold`, 9.22:1): the playful pixel layer only — the intro loader's pixel-art portrait (face at 28% fill, hair/glasses/mustache at 100%) and, inside the hero terminal, typed command lines and the idle animation (at 40%). Never on structural UI.

### Tertiary
- **Signal Green** (`signal-green`, 8.69:1): "live, ongoing, ready." The pulsing status dot in the hero and in the stats badge, the education "Em andamento" marker and label, and the terminal's `>` / `$` prompt glyphs.
- **Ticker Lime** (`ticker-lime`, 13.13:1): the rotated diamond separator between items in the `Marquee`. Never outside that component.

### Neutral
- **Near-Black Ink** (`near-black-ink`): the only page background. Sections are separated by borders, never by a fill.
- **Soft Graphite** (`soft-graphite`): body text. Secondary text is the same color at reduced opacity — never below 70% for text under 18px (at 40–50% it fails AA).
- **Inverse Surface / Inverse Text**: the one deliberate inversion — solid white pills with black text for the highest-priority CTA in the hero and the footer's "Contrate-me".
- White-opacity borders (`white/10` through `white/30`) are the neutral scale for dividers, card outlines and resting button borders.

### Named Rules
**The Signal Rule.** Each accent color means one thing — red: you interacted / this is annotated; green: live or ongoing; gold: the playful pixel/terminal layer; lime: ticker beat. Extend a color only within its meaning, and never introduce a fifth accent.

**The Interactive-Only Rule.** Red fills a surface only in response to interaction (hover, focus, current page). At rest, interactive elements stay neutral on the white-opacity border scale. No button is filled red at rest.

## Typography

**Display Font:** Inter, weights 800/900 only (`--font-inter-display`)
**Body Font:** Geist (`--font-geist-sans`)
**Mono/Label Font:** Geist Mono (`--font-geist-mono`)
**Quote-Accent Font:** Playfair Display, italic only (`--font-playfair`)
**Signature Font:** Dancing Script (`--font-dancing-script`)

**Character:** Geist does the quiet work in every paragraph. Geist Mono is the console voice — labels, prompts, terminal output, the marquee. Three accent faces are struck sparingly: Inter Black for the loudest headlines, Playfair italic for one clause, Dancing Script for a literal signature.

### Hierarchy
- **Display** (900, `text-5xl`→`text-7xl` for the hero name, `text-3xl`→`text-6xl` for section headlines): hero name (revealed with a stepped clip-path "typewriter"), stats headline, footer CTA headline, card titles on Credenciais/Projetos at `text-xl`→`text-2xl`.
- **Quote-Italic** (400 italic): the second clause of the Core Focus headline, split at its em dash.
- **Title** (600, `text-3xl`→`text-4xl`): page `h1`s (Sobre, Credenciais, Projetos) — semibold sans, no accent face.
- **Body** (400, `text-sm`–`text-base`, 1.6 line-height, 70–90% opacity): bios and descriptions. Long prose is capped at `max-w-prose` (~65ch).
- **Label** (500 mono, `text-xs` minimum, `tracking-[0.15em]`–`[0.2em]`, uppercase): nav, eyebrows, stat labels, skill levels, terminal chrome. Nothing ships below 12px.
- **Script** (500, `text-3xl`): the name as a signature under the Core Focus quote; the intro's "Hello" is stroke-drawn via `stroke-dashoffset`, not typeset.

### Named Rules
**The Two-Voice Quote Rule.** Where Display and Quote-Italic meet — only the Core Focus headline — the clause before the em dash is black display weight and the clause after is italic serif. Never swap them or add a second location without a reason.

**The 12px Floor Rule.** No functional text below `text-xs` (12px) — terminal chrome, skill levels and the scroll-progress label included.

## Layout

Single content column, `max-w-5xl`, centered, `px-4` under `sm`, `px-6` from `sm`. The `<main>` clears the fixed floating header with `--header-offset` (5.5rem). Spacing uses Tailwind's default scale directly; section rhythm on the home is `gap-10 sm:gap-14`, pinned sections pad `py-10 sm:py-14`, the footer CTA band breathes more at `py-16 sm:py-24`.

`sm` (640px) is the main breakpoint: nav collapses to a toggle, the about grid goes from stacked to 2/3 split, stats go from 2 to 4 columns. The hero alone uses `md` (768px): above it the terminal window takes a 340px right column; below it the window disappears and a floating `>_` button opens the terminal fullscreen. Content holds from a 375px viewport up.

Full-bleed strips (home marquee, the about photo) break out of the column with `w-screen`; `body { overflow-x: clip }` keeps the scrollbar width from creating horizontal scroll.

Collections are stacked lists, not carousels: Credenciais stacks education cards then certificate cards; Projetos stacks project cards (cover left from `sm`); the home's project preview is a 1/2/3-column grid.

## Elevation & Depth

Flat. No `box-shadow` exists anywhere in the system. Separation comes from stacked white-opacity borders (`white/10` faintest, `white/30` most emphatic at rest) and translucent glass only where something floats over content: the header island (`bg-background/80` + `backdrop-blur-md`), the mobile nav panel, and the terminal window (`bg-black/55` + `backdrop-blur-2xl`).

### Named Rules
**The No-Shadow Rule.** Never add a `box-shadow` to signal elevation or hover. Step the border opacity up, swap the border to accent, or use Signal Glow — in that order.

**The Light-Not-Depth Rule.** Interaction feedback is light, not elevation: `.signal-glow` is a blurred `radial-gradient` pseudo-element, the stat `value-pulse` is a `text-shadow`. Neither is the `box-shadow` property, so neither contradicts the No-Shadow Rule.

## Shapes

Radius follows role, not size. **Full** (9999px) for anything you act on directly — buttons, chips, the header island, icon circles, the avatar, status dots. **Large** (8px) for anything you read inside — cards and cover images. **XL** (12px) only for the terminal window, which mimics an OS window. **2XL** (16px) only for the mobile nav panel, because a pill growing to fit a stacked list distorts into an oval. Nothing uses a sharp corner.

Dashed borders are a rarer, "measured/structural" vocabulary — only the stats grid, one dashed border per cell (right + bottom, the container closes top + left).

## Components

### Buttons
- **Primary pill:** white fill, black text, `rounded-full`, `10px 20px`, `hover:opacity-90` plus Signal Glow. Only the hero CTA (download CV, falling back to "Ver projetos" when no CV is published) and the footer's "Contrate-me".
- **Outline pill:** transparent, `border-white/30`, same pill; hover swaps border and text to accent. CV download outside the hero, "Validar credencial", "Ver código" / "Ver demonstração". The only secondary style — there is no rectangular button on any page.
- **Icon circle:** 44px social links (`border-white/30`, hover to accent) and red-bordered action circles (scroll hint 44px, back-to-top 36px) that fill solid red on hover with a black glyph (~5.6:1).
- **Focus:** every control gets the global `:focus-visible` ring — 2px annotation red, 3px offset. Mouse clicks never show it.

### Chips
- **Style:** `rounded-full`, `border-white/15`, `2px 10px`, `text-xs`. Tech-stack tags on project and education cards.

### Cards / Containers
- **Corner Style:** 8px (`rounded-lg`).
- **Background:** none — borders on the black ground.
- **Border:** `border-white/15` at rest; linked cards (home project preview, section cards) swap to accent on hover/focus, lift 2px, glow, and move an arrow (`↗`/`→`) from 50% to 100% opacity — never color alone.
- **Internal Padding:** 20px (`p-5`).
- **Empty data hides:** a card or field with no data is not rendered; certificates without an image show the issuer initial plus "Documento ainda não enviado".

### Navigation
Floating pill island, fixed and centered at the top. Mono labels with a red underline that draws in from the left on hover and stays on `aria-current="page"` (plus accent color and semibold). Below `sm` a 44px "Abrir menu" toggle reveals a separate rounded panel, rendered only while open; Esc closes it.

### Hero Terminal (signature component)
An interactive console beside the hero: a window with three traffic-light dots (24px hit areas around 12px dots), a `portfolio.sh` title, a scrolling output and a prompt line (`ljb@portfolio $`). Commands: `/help`, `/sobre`, `/stacks`, `/formacao`, `/links`, `/clear`, with history (↑/↓) and Tab completion that only captures Tab when there is something to complete. Idle state is an ASCII robot jumping server racks in gold at 40%, frozen under reduced motion and paused while minimized. Minimizing collapses it to a pill. On mobile it is a floating `>_` button that opens a fullscreen modal dialog (focus moves into the input; Esc closes).

### Intro Loader
Once per session: a gold pixel-art portrait assembles block by block, "Hello" is hand-drawn in script, the overlay fades out. Skipped for reduced motion and for returning visitors in the same session. A CSS failsafe hides it after 4s even if JavaScript never runs.

### Pinned Section
The reveal device for Core Focus, Stats and the Sobre blocks: the section pins below the header (offset measured from the real header element) while a scrubbed GSAP timeline reveals its parts. `prefers-reduced-motion` disables the pin entirely rather than trapping scroll. New scroll-reveal sections reuse it rather than building a second device.

### Stats
Badge with green pulse, a Display headline, and a dashed grid of exact counts (projects, technologies, certificates, languages) that count up and flash `value-pulse` once. No "+" suffix; a count of zero is hidden instead of shown.

### Marquee (ticker)
Bold uppercase mono, alternating solid and outlined words, a lime diamond between items, an infinite CSS loop with faded edges. Full opacity as the home skills strip; at 8% opacity, rotated ±6°, as texture behind the footer CTA — the same component, never a fork. Pauses on hover; static under reduced motion. Always `aria-hidden` (it repeats skills listed on Sobre).

### Skill Bars
Name (mono, wraps instead of truncating), a 1px track whose fill scales to the level (EXPERT 100%, ADV 75%, INT 50%, JR 28%), and the level label. The fill animates in once on scroll; the label always carries the information.

### Scroll Progress
Fixed vertical rail on the right from `sm`: a 1px track with a red fill and the current section's short label written vertically. Decorative (`aria-hidden`).

## Do's and Don'ts

### Do:
- **Do** hide a section, field or stat entirely when its data is null, empty or zero — never render a broken image, a dead button or an invented number.
- **Do** honor `prefers-reduced-motion` completely: kill GSAP timelines and pins, freeze the terminal animation, use `auto` instead of `smooth` scrolling, leave marquees static but legible.
- **Do** reuse Pinned Section for scroll reveals and `.signal-glow` for interaction feedback instead of one-off treatments.
- **Do** pair a color cue with a second cue on hover (border + arrow opacity, border + glow).
- **Do** keep secondary text at ≥70% opacity when it is under 18px, and nothing below 12px.

### Don't:
- **Don't** add a `box-shadow` anywhere; depth is border-opacity, feedback is light.
- **Don't** fill a surface with annotation red at rest, and don't add a rectangular button to the public site.
- **Don't** give an accent color a meaning outside its signal (gold on structural UI, lime outside the ticker).
- **Don't** use `next/image` for `photoUrl` or GitHub cover images — they are arbitrary external URLs; the plain `<img>` is deliberate. Local certificate images do use `next/image`.
- **Don't** use characters, art or names from existing games or brands in playful elements; keep them original.
