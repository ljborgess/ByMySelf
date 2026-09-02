---
name: ByMySelf
description: Portfólio full-stack dark, editorial e técnico — moldura de prancheta em vermelho, rótulos monoespaçados, calor de assinatura à mão.
colors:
  near-black-ink: "#0a0a0a"
  soft-graphite: "#cccccc"
  blueprint-red: "#ef4444"
  marker-gold: "#f59e0b"
  signal-green: "#22c55e"
  ticker-lime: "#a3e635"
  accent: "{colors.blueprint-red}"
  inverse-surface: "#ffffff"
  inverse-text: "#000000"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 3.75rem)"
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
    fontSize: "clamp(1.875rem, 4vw, 3.75rem)"
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
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
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
  button-utility:
    backgroundColor: "transparent"
    textColor: "{colors.soft-graphite}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-icon:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "{colors.blueprint-red}"
    rounded: "{rounded.full}"
    size: "44px"
  badge:
    backgroundColor: "transparent"
    textColor: "{colors.soft-graphite}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-accent:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  card:
    backgroundColor: "transparent"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: ByMySelf

## Overview

**Creative North Star: "The Draftsman's Signature"**

The site reads as a technical drawing that a person has annotated by hand. At rest it is disciplined and almost architectural: solid black ground, a single desaturated body color, hairline borders, and a repeated frame of thin red rules with four corner tick marks — the registration marks of a blueprint — that pins the page in place while a section reveals itself. Labels are monospace and uppercase, tracked wide like drafting callouts. Then, deliberately, the discipline breaks: a headline mixes a black-weight word with an italic serif one inside the same quote, a name signs off in cursive script, and the very first thing a visitor sees is that signature being hand-drawn stroke by stroke before the page settles. The tension between drafting-table precision and a handwritten signature *is* the system — neither reads as the whole story alone.

Four accent colors exist, and each owns exactly one job rather than functioning as a generic brand palette: red is the frame and the annotation ink, gold is a highlighter dragged behind one word in the hero, green is a live status pulse, lime is a beat mark in the scrolling ticker. Depth never comes from a shadow — this system has none — it comes from stacking border opacity (10% through 30% white) and from the red frame device itself.

**Key Characteristics:**
- Dark-only, solid black ground (`#0a0a0a`) — no gradient, no aurora glow (a prior direction, explicitly retired).
- A single reusable "pinned frame" signature device: thin red border + four corner ticks, scroll-pinned while its content reveals.
- Four named highlight colors, each with one non-negotiable role — never a shared "accent bucket."
- Flat by default. No shadows anywhere in the system; depth is border-opacity layering.
- Monospace, wide-tracked, uppercase labels everywhere something needs to read as a technical callout (nav, eyebrows, tags).
- One deliberate rule-break: black-weight sans + italic serif inside a single quote, and a cursive signature — the human counter-voice to the drafting-table discipline.

## Colors

Four highlight colors, each locked to one purpose, on a near-black ground with a single body-text gray. All four highlight colors pass WCAG AA (4.5:1) against the background.

### Primary
- **Blueprint Red** (`#ef4444`, 5.26:1 on background): the frame and annotation color — every `PinnedFrameSection` border and its four corner ticks, the "CORE FOCUS" eyebrow label, the active node/card border in the horizontal timeline, and the circular icon-button hover fill (scroll hint, back-to-top). `--accent` is currently an alias of this color.

### Secondary
- **Marker Gold** (`#f59e0b`, 9.22:1): a single highlighter block dropped behind one word — the hero name — never used anywhere else on the site.

### Tertiary
- **Signal Green** (`#22c55e`, 8.69:1): exactly one job, a small pulsing dot inside the stats section's "PROFESSIONAL STATISTICS" badge — the only place the site claims something is "live."
- **Ticker Lime** (`#a3e635`, 13.13:1): the rotated diamond separator between repeated items in the `Marquee` ticker. Never used outside that component.

### Neutral
- **Near-Black Ink** (`#0a0a0a`): the only background color in the system. No secondary surface tone — sections are distinguished by borders, not by fill.
- **Soft Graphite** (`#cccccc`): the default body text color.
- **Inverse Surface / Inverse Text** (`#ffffff` / `#000000`): the one deliberate inversion — solid white pill buttons with black text, used only for the site's two highest-priority CTAs (hero's "view projects," footer's "hire me").
- White-opacity borders (`white/10` through `white/30`) carry all structural dividers, card outlines, and resting button borders — there is no separate neutral border token; opacity on white *is* the neutral scale.

### Named Rules
**The One Role Rule.** Each highlight color has exactly one job (frame, hero mark, live pulse, ticker beat). Never reassign a highlight color to a role it doesn't already own, and never introduce a fifth "just for this" accent — extend an existing role's usage or leave it monochrome.

**The Interactive-Only Rule.** `--accent` (blueprint red) fills a surface only at a hover/active/current moment — nav's current page, a card's hover border, a featured badge, a focus ring. At rest, interactive elements stay neutral (white-opacity border); color is the site telling you something responded to you, not decoration.

**Verify before quoting.** `--accent` is currently `var(--highlight-red)` (`#ef4444`) per `globals.css`, the canonical source. A stale comment elsewhere in the codebase (`cv-download-button.tsx`) still describes it as `#8bc7ff` and a since-outdated contrast ratio — that comment predates the highlight-color refactor. Read `globals.css`, not a nearby comment, before asserting `--accent`'s value or a contrast claim about it.

## Typography

**Display Font:** Inter (weights 800/900 only, loaded as `--font-inter-display`)
**Body Font:** Geist Sans (`--font-geist-sans`)
**Mono/Label Font:** Geist Mono (`--font-geist-mono`)
**Quote-Accent Font:** Playfair Display, italic only (`--font-playfair`)
**Signature Font:** Dancing Script (`--font-dancing-script`)

**Character:** Geist carries every paragraph and does the quiet work. Three single-purpose faces exist only to be struck like accents: Inter Black for the loudest headlines, Playfair italic for one clause per page at most, Dancing Script for a literal signature. None of the three accent faces is a general-purpose heading font — each appears in a specific, narrow context, never as a default.

### Hierarchy
- **Display** (900, `clamp(2.25rem, 6vw, 3.75rem)` / `text-4xl sm:text-6xl`, tight line-height): hero name, section headlines (stats, footer CTA). Always paired with `font-black`; this is the loudest voice on the page and is spent sparingly — at most one per section.
- **Quote-Italic** (400 italic, `clamp(1.875rem, 5vw, 3rem)`): the second half of the Core Focus quote only, split from the headline at its em dash. Never appears alone — it always follows a Display-weight clause in the same quote.
- **Title** (600, `text-2xl`–`text-4xl`): page-level headings (Projetos, Formação list titles) that aren't the hero/CTA voice — semibold sans, no accent face.
- **Body** (400, `text-sm`–`text-base`, 1.6 line-height, often at 70–90% opacity rather than a lighter color token): bios, descriptions, card copy.
- **Label** (500 mono, `text-xs`, `tracking-[0.15em]`–`[0.2em]`, uppercase): nav links, eyebrow labels ("CORE FOCUS", stat badges), tech-tag chips. The system's signature "technical callout" voice.
- **Script** (500, `clamp(1.875rem, 4vw, 3.75rem)`): the profile name as a literal signature under the Core Focus quote, and the hand-drawn greeting in the intro loader (drawn via `stroke-dasharray`, not typeset).

### Named Rules
**The Two-Voice Quote Rule.** Wherever Display and Quote-Italic meet — currently only the Core Focus headline — the clause before the em dash is always the black display weight and the clause after is always the italic serif. Never swap them, never mix a third weight in, and don't extend the pairing to a second location without a specific reason; its rarity is what makes it read as a deliberate accent instead of a second heading style.

## Layout

Single content column, `max-w-5xl`, centered (`mx-auto`), horizontal padding `px-4` under `sm`, `px-6` from `sm` up. There is no custom spacing scale — every gap, padding, and margin uses Tailwind's default numeric scale directly (`gap-3`/`gap-4`/`gap-6`/`gap-8`, gutters mostly `4`–`6`, section rhythm mostly `8`).

Section density: pinned/frame sections (`PinnedFrameSection`) pad `px-6 py-10` under `sm`, `px-10 py-14` from `sm`. The footer's CTA band is looser, `py-16 sm:py-24` — the one place the page is allowed to breathe more than the frame sections around it.

Responsive collapse follows one repeated pattern: side-by-side above `sm`, stacked below it (hero avatar+name, nav becomes a toggle menu at `sm`, stat grid drops from 4 to 2 columns). `sm` (640px, not `md`) is the system's one real breakpoint; content is designed to hold from a 375px viewport up.

Grid behavior is content-shaped, not uniform: the projects list uses `grid-auto-flow: dense` so a `featured` project spans two columns among evenly-sized cards, rather than a carousel or fixed hero slot (a carousel existed in a prior epic and was removed). Formação and Certificados don't grid at all — they use the horizontal-scrolling node timeline instead, one active item promoted into a full-width card above the track.

## Elevation & Depth

Flat. No `box-shadow` exists anywhere in the system. Depth and separation come from two devices instead: stacked white-opacity borders (`white/10` for the faintest dividers, up to `white/30` for the most emphatic resting border) and the red pinned-frame device, whose four corner ticks read as a physical registration mark rather than a shadow-cast edge.

### Named Rules
**The No-Shadow Rule.** Never add a `box-shadow` to signal elevation or hover state. Reach for a border-opacity step up, an `accent` border swap, or (for a scroll-pinned reveal) the frame device — in that order.

## Shapes

Two radii carry the whole system, chosen by a component's role rather than its size: **full** (`9999px`) for anything you act on directly — buttons, badges/chips, the avatar, icon-circle buttons, status dots — and **`lg`** (`8px`) for anything you read inside of — cards, cover images. `md` (`6px`) appears only on the admin panel's compact utility controls (form inputs, the bordered rectangular button), and `sm` (`4px`) only inside rendered markdown content (inline code, embedded images). Nothing in the system uses a sharp (`0`) corner except the pinned-frame device itself, whose hairline border is deliberately architectural against the otherwise rounded vocabulary.

Dashed borders are a second, rarer vocabulary reserved for "structural/incomplete" moments — the stats grid's internal dividers and an admin empty-state's container — echoing the frame device's drafting-table register without competing with it.

## Components

### Buttons
- **Primary (filled pill):** solid white, black text, `rounded-full`, `10px 20px` padding, `hover:opacity-90`. The site's highest-priority CTA only — used exactly twice (hero "ver projetos," footer "hire me"). Black-on-`#ef4444` (the button's own outline variant) is not this; this variant is always white-on-solid.
- **Outline pill:** transparent, `border-white/30`, same pill shape and padding, `hover:border-accent hover:text-accent`. The paired secondary action next to a primary pill (CV download beside "hire me").
- **Utility (rectangular):** transparent, `border-white/20`, `rounded-md`, `8px 16px`, `hover:border-accent`. Reserved for the admin panel and forms (login submit, "new project," move up/down) — never appears on the public marketing pages, where every button is a pill.
- **Icon circle:** transparent at rest with a `border-blueprint-red`, `rounded-full`, two sizes (`44px` scroll-hint, `36px` back-to-top) — `hover:bg-highlight-red` (fills solid on hover, text/icon stays visible against it). The only button family with a color-fill hover instead of an opacity or border change.

### Badges / Chips
- **Style:** `rounded-full`, `border-white/15`, `2px 10px`, `text-xs` mono-adjacent uppercase-tracked label. Used for tech-stack tags, ongoing-education markers, and admin status pills.
- **Accent variant:** same shape, `text-accent border-accent` — reserved for "featured" flags on projects (list card, detail page, admin table).
- **Status variant (admin only):** the one place the system uses non-monochrome semantic color outside the four highlight roles — `emerald` (completed), `amber` (in progress), neutral `white/5` (archived) — chosen so status is legible by more than hue alone (archived is desaturated, not just a third color).

### Cards / Containers
- **Corner style:** `rounded-lg` (8px).
- **Background:** none — cards are borders on the black ground, not filled surfaces.
- **Border:** `border-white/15` at rest, swapping to `border-accent` (or already `border-accent` when `featured`) on hover/focus-visible.
- **Internal padding:** `20px` (`p-5`).
- **Interaction:** the entire card is the link target (never just the heading), and a hover always moves an `→` affordance from 50% to 100% opacity alongside the border-color swap — two cues together, not color alone.

### The Pinned Frame (signature component)
Thin `border-blueprint-red` rectangle with four `6px` red squares at the corners (offset `-3px`, so they sit astride the border rather than inside it) — a technical-drawing registration mark. Wraps the Core Focus quote and the Stats block; pins via `ScrollTrigger` while its internal content reveals on a scroll-scrubbed GSAP timeline. `prefers-reduced-motion` disables the pin entirely (not just the internal animation) rather than trapping scroll for nothing. This is the one component every future "reveal on scroll" section should reuse rather than reinvent — a second, different framing device would fracture the system's one strongest visual signature.

**Deepened 2026-08-27 ("interactive and futuristic," user-directed amplification of the existing world — see the two new patterns below, both extensions of this same device, not separate effects):** a **scan-sweep** beam crosses the frame once, left to right, the instant it enters the viewport — the frame "activating," like an instrument locking on. Fires from `ScrollTrigger`'s `onEnter` (`once: true`), never loops. And a **cursor-reactive spotlight** (a soft `10%`-opacity red radial gradient following the pointer, `frame-spotlight` in `globals.css`) lights the frame's interior while the pointer is inside it — the frame reading as a reactive instrument, not a static panel. Both fall away completely under `prefers-reduced-motion`, same as the pin itself.

### Signal Glow (interaction language, added 2026-08-27)
A light-emission hover/focus treatment layered onto every interactive element system-wide (buttons, cards, nav links, timeline controls) — `.signal-glow` in `globals.css`. Built from a blurred `radial-gradient` pseudo-element (`filter: blur`), **never `box-shadow`**, so it stays a distinct vocabulary from the (still shadow-free) elevation system: this is light as feedback, not depth. Fires only on `:hover`/`:focus-visible` — extending the Interactive-Only Rule with glow instead of only a border-color swap, not replacing it. A `.signal-glow-active` persistent variant exists for standing "this is the current one" markers (the active timeline node, a featured project card) — the same precedent the nav already set for `aria-current` (solid color, not just hover).

Two small siblings, same family: a **nav glow-underline** (`.nav-glow-link`) that draws in from the left rather than swapping color instantly, and a **value-pulse** (`.value-pulse`, `text-shadow` not `box-shadow`) that flashes once on a stat number the instant its count-up animation completes — reinforcing "live data" without inventing a fake status label.

### Named Rules
**The Light-Not-Depth Rule.** Signal Glow and its siblings use `filter`/`radial-gradient`/`text-shadow` — deliberately never the `box-shadow` property — so a glow can be added anywhere without touching or contradicting the No-Shadow Rule. Depth is still exclusively border-opacity and the frame device; glow is a separate, later-added vocabulary for interaction feedback.

### Marquee (ticker)
Bold, uppercase, mono, `text-4xl sm:text-6xl`, an infinite CSS-only horizontal loop with a rotated `ticker-lime` diamond between repeated items. Used at full opacity as the certificates/skills ticker, and at `8%` opacity, rotated ±6°, as a decorative texture layer behind the footer CTA — same component, never a variant fork.

### Horizontal Timeline
Active item promoted into a full-width `border-blueprint-red` card above a scrollable node track; nodes are small circles, the active one filled `blueprint-red`, others `border-white/30`. Navigation is explicit prev/next buttons plus click-any-node — deliberately not scroll-position heuristics, so it stays robust on touch and fully keyboard-operable. Shared by Formação and Certificados with page-specific card content.

### Inputs / Fields (admin only)
`border-white/20`, `rounded-md`, `focus-visible:border-accent`, no glow/ring — the only focus treatment in the system is a border-color swap to accent, matching buttons and nav.

### Navigation
Mono, uppercase-tracked labels; current page gets `text-accent` + `font-semibold` (`aria-current=page` driven, not a background pill). Collapses to a toggle-revealed panel below `sm` rather than reflowing five labels into a second row.

## Do's and Don'ts

### Do:
- **Do** hide a section entirely when its data is null/empty/absent, never render a broken image, a dead button, or an empty heading in its place.
- **Do** honor `prefers-reduced-motion` completely — kill GSAP timelines and ScrollTrigger pins, not just soften them; swap `smooth` scrolling to `auto`; leave marquees static but legible.
- **Do** reuse the Pinned Frame for any new scroll-reveal section rather than styling a bespoke wrapper.
- **Do** keep `accent` (blueprint red) reserved for interactive/current/hover states; a resting element stays on the white-opacity border scale.
- **Do** pair a color cue with a second cue (an arrow's opacity, a border swap) on hover — never color alone.
- **Do** reuse `.signal-glow` / `.signal-glow-active` for any new interactive element's feedback rather than styling a one-off hover treatment; it is the system's one interaction-feedback language now, the same way the Pinned Frame is the one reveal device.

### Don't:
- **Don't** add a `box-shadow` anywhere; depth is border-opacity and the frame device only.
- **Don't** give a highlight color (gold, green, lime) a second job outside the one it already owns.
- **Don't** trust a value for `--accent` from a code comment without checking `globals.css` — see the Colors section's note on the stale `#8bc7ff` reference.
- **Don't** use `next/image` for `photoUrl` or project cover images — they're arbitrary owner-pasted URLs; the plain `<img>` is a deliberate constraint, not an oversight.
- **Don't** put a rectangular "utility" button on a public marketing page, or a pill button inside the admin panel — the two button families mark Persuade vs. Operate context and shouldn't cross over.
