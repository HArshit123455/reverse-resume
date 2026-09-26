---
name: Reverse Resume
description: Ask my work anything. A keynote-staged portfolio where every claim cites real code.
colors:
  stage: "#ffffff"
  tile: "#f5f5f7"
  sunk: "#ebebf0"
  ink: "#1d1d1f"
  ink-soft: "#424245"
  muted: "#6e6e73"
  muted-2: "#86868b"
  hairline: "rgba(0, 0, 0, 0.08)"
  hairline-strong: "rgba(0, 0, 0, 0.16)"
  indigo: "#3d3af2"
  indigo-wash: "rgba(61, 58, 242, 0.09)"
  indigo-ink: "#ffffff"
  nav-glass: "rgba(255, 255, 255, 0.84)"
  stage-dark: "#000000"
  tile-dark: "#161617"
  sunk-dark: "#1d1d1f"
  ink-dark: "#f5f5f7"
  ink-soft-dark: "#d2d2d7"
  muted-dark: "#a1a1a6"
  hairline-dark: "rgba(255, 255, 255, 0.1)"
  hairline-strong-dark: "rgba(255, 255, 255, 0.2)"
  indigo-dark: "#8b8cff"
  indigo-wash-dark: "rgba(139, 140, 255, 0.14)"
  indigo-ink-dark: "#000000"
  nav-glass-dark: "rgba(0, 0, 0, 0.8)"
  love: "#e0306e"
  love-dark: "#ff7fab"
typography:
  display:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(52px, 10.4vw, 96px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 104"
  headline:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(44px, 7.4vw, 84px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 104"
  headline-sm:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(38px, 5.6vw, 64px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(26px, 2.8vw, 34px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  lede:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(19px, 2vw, 23px)"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.018em"
  body-reading:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.011em"
  body:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.011em"
  label:
    fontFamily: "Mona Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  cell: "3px"
  row: "12px"
  inset: "14px"
  card: "18px"
  dialog: "22px"
  tile: "28px"
  pill: "999px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  tile-pad: "24px"
  tile-pad-wide: "56px"
  stage: "96px"
  stage-wide: "144px"
  container: "1120px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stage}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  ask-field:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "64px"
    padding: "0 8px 0 28px"
  ask-send:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stage}"
    rounded: "{rounded.pill}"
    size: "48px"
  segmented-control:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "3px"
  segmented-thumb:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  citation-marker:
    backgroundColor: "{colors.indigo-wash}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.pill}"
    height: "18px"
    padding: "0 6px"
  source-card:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  stage-tile:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "{spacing.tile-pad-wide}"
  nav-bar:
    backgroundColor: "{colors.nav-glass}"
    textColor: "{colors.ink-soft}"
    height: "48px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stage}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
---

# Design System: Reverse Resume

## Overview

**Creative North Star: "The Keynote Stage"**

The site is a keynote. Each section is a stage that holds one statement at keynote scale, and a chat answer lands like the next slide, with numbered source footnotes. There are two stages: in light mode it is a white product page, and in dark mode it is a black keynote hall. Tiles sit one tone off the stage. Nothing casts a shadow and nothing uses a gradient. The only colour on the page is one electric indigo, and it is used for evidence: citations, the active footnote, the commit graph, focus and the live dot.

Density is low and confident. A stage gets 96 to 144px of vertical air, and a statement gets a 96px headline in a single sans at tight tracking. Grey carries the supporting line, and full ink is saved for the words that matter. Motion comes down to one authored gesture. A statement rises 28px and un-blurs as its stage arrives, and it does this once. Everything else is a quiet colour or transform transition on the same ease-out-quint curve.

The world refuses the cream-serif editorial card grid. There is no serif, no paper tint, no card-with-shadow grid and no decorative accent.

**Key Characteristics:**
- White or black stage, with #f5f5f7 or #161617 tiles one step off it
- One face, Mona Sans, at 700 for statements and pulled wide (wdth 104) at display sizes, with Geist Mono only for code and data
- One indigo, used only where there is evidence or state
- Flat throughout: tonal steps and hairlines, never shadows
- Pills for controls and 28px corners for stage tiles
- One entrance, the stage reveal (rise 28px, un-blur 10px, once)

## Colors

A near-monochrome Apple-product palette with one electric indigo reserved for evidence and state. Every role has a light value and a dark value, and love mode swaps only the accent.

### Primary
- **Evidence Indigo** (`indigo`, dark `indigo-dark`): citation markers, the active footnote's ring and number, the source rail's excerpt and source links, the commit graph's top level, the focus outline, the text caret, selection and the live dot. `indigo-wash` is the resting fill of a citation marker. `indigo-ink` is the text colour on solid indigo.

### Secondary
- **Love Pink** (`love`, dark `love-dark`): only when the love-mode easter egg is on. It replaces the indigo in every indigo role. It is not a second accent.

### Neutral
- **Stage** (`stage` / `stage-dark`): the page itself, pure white or pure black.
- **Tile** (`tile` / `tile-dark`): stage tiles, the ask field, segmented tracks, source cards, impact tiles and code blocks. This is the only surface lift in the system.
- **Sunk** (`sunk` / `sunk-dark`): disabled send buttons, the empty level of the commit graph and the active segment thumb in dark mode.
- **Ink** (`ink` / `ink-dark`): headlines, primary buttons, links, active navigation and toasts (shown inverted).
- **Ink Soft** (`ink-soft` / `ink-soft-dark`): body copy, reading prose and navigation at rest.
- **Muted** and **Muted 2**: ledes, meta lines, captions, placeholders, list markers and inactive tabs.
- **Hairline** and **Hairline Strong**: row dividers, the nav's bottom edge, outline-button rings and scrollbar thumbs.
- **Nav Glass** (`nav-glass` / `nav-glass-dark`): the translucent fill behind the frosted nav and the sticky follow-up bar.

The commit graph's five levels are mixed in OKLab from `sunk` toward `indigo` (0, 22, 45, 72 and 100% in light; 0, 26, 50, 76 and 100% in dark).

### Named Rules
**The Evidence Indigo Rule.** Indigo is used only for citations, the active footnote, the commit graph, focus and the live dot. Links and primary buttons are ink (fg), not indigo. If a surface has no evidence and no state, it carries no indigo.

**The One Accent Rule.** Love mode swaps the accent. It never adds one. The system never shows two accents at the same time.

## Typography

**Display Font:** Mona Sans, variable with the wdth axis (falls back to ui-sans-serif, system-ui)
**Body Font:** Mona Sans (the same face)
**Label/Mono Font:** Geist Mono, 400 and 500

**Character:** GitHub's own grotesque does all the work. It sits at 700 and is tracked tight (-0.03 to -0.045em) for statements, with the width axis pushed to 104% on the largest lines so they read as keynote slides. Geist Mono is a data voice. It appears only in code, tech tags, keyboard hints and footnote numbers.

### Hierarchy
- **Display** (700, clamp 52 to 96px, 0.98, -0.04em, wdth 104): one per page, used for the hero statement, the About name and the Chrysa title. The About and Chrysa titles tighten to 0.95 and -0.045em.
- **Headline** (700, clamp 44 to 84px, 1.0, -0.04em, wdth 104): home stage statements ("Selected work.", "Also building", the close). The featured project title and the commit-graph statement sit in the same register at a 72px cap.
- **Headline Small** (700, clamp 38 to 64px, 1.02, -0.04em): About section heads and CTA statements.
- **Title** (700, clamp 26 to 34px, 1.08, -0.03em): project rows, timeline entries and the question heading of a chat turn (up to 38px).
- **Lede** (500, clamp 19 to 23px, 1.35, -0.018em, muted): the supporting line under a statement, capped at 34 to 40ch.
- **Body Reading** (400, 19px, 1.65, ink-soft): Chrysa story prose, project descriptions and achievements. Chat answers use 18px at 1.6. Line length is capped at 58 to 64ch.
- **Body** (400, 17px, 1.55, -0.011em): the base size for everything else.
- **Label** (400 to 500, 13 to 15px): meta lines, nav, segmented options, captions and the footer.
- **Mono** (Geist Mono 400, 12 to 13px): code (13px), tech tags joined with a spaced middle dot, ⌘K hints and footnote numbers.

### Named Rules
**The Meta Below Rule.** Nothing sits above a heading. There is no eyebrow and no kicker. Meta lines (kind · year, dates, availability) go below the title in muted 15px.

**The Grey-then-Ink Rule.** A lede sits in muted grey, and the few words that carry the claim step forward in full ink. Emphasis comes from value, not from weight or colour.

**The Tabular Discipline Rule.** Tabular figures are used only in tables, dates and footnote numbers. Display numbers such as "514 commits" and the impact figures use proportional figures.

## Layout

The layout is a centred stage. Every section is one `1120px` container with 20px gutters (32px from `sm`). Stages get 96px of vertical padding (144px from `sm`), and About sections stack 112 to 160px apart. The home first viewport fills the height (`100svh` minus the 48px nav) and is centred, and its hero column is capped at 860px. A conversation narrows to 760px.

Project rows are full-width slides separated by a hairline, laid out on a 12-column split (5 columns for name and meta, 7 for the story). The flagship row takes the stage alone at up to 900px wide. The Chrysa read uses a 220px sticky chapter rail beside a 680px article from `lg` up. The rail is hidden on smaller screens. Lists (timelines, skills, achievements, facts) are hairline-ruled rows, never cards. On mobile everything goes to one column, the source rail becomes a `details` disclosure, and the follow-up bar pins to the bottom edge with safe-area padding.

## Elevation & Depth

The system is flat. Depth is tonal: a tile is one step lighter (light mode) or lighter-black (dark mode) than the stage, and rows are divided by 8 to 10% hairlines. The only blurs are material, not shadow. The sticky nav and follow-up bar are frosted glass (`backdrop-blur-xl`, saturate 1.8, over `nav-glass`), and the command palette dims the page with a 40% black scrim and `backdrop-blur-md`. The shadow tokens exist and resolve to `none`.

### Named Rules
**The Flat Tile Rule.** Tiles are flat and have no shadows, in any state. Hover changes a scale or a ring, never elevation. Active state is a 2px indigo inset ring (the active footnote) or a solid fill.

## Shapes

There are two silhouettes, the pill and the rounded tile. Every control is a full pill: buttons, the ask field, segmented tracks and thumbs, citation markers, the ⌘K hint, icon buttons and the toast. Stage tiles use 28px corners. Contained cards step down by size: source cards and impact tiles at 18px, code blocks and tooltips at 14px, palette rows at 12px, and the palette dialog at 22px. Commit cells are 3px squares. App icons use a continuous-looking corner of about 22%. Borders are 1px hairlines, drawn as `ring-inset` on pills so they never shift layout.

## Components

### Buttons
Solid ink pills that invert the stage.
- **Shape:** full pill (999px), 48px tall, 24px horizontal padding, 16px medium label, with an optional 16 to 18px icon and an 8px gap.
- **Primary:** ink fill with stage-coloured text. There is one per stage.
- **Hover / Focus:** scale to 1.02 on the stage ease over 300ms. Focus is a 2px indigo outline offset by 3px.
- **Outline:** transparent with a 1px inset `hairline-strong` ring and ink text. The ring goes to ink on hover.
- **Icon buttons:** 44px (profiles) or 32px (theme) pills in ink-soft. On hover they go to ink, and the profile buttons also take a tile fill.
- **Send:** a 48px ink circle holding an arrow-up. It scales to 1.04 on hover. When disabled it takes the `sunk` fill and `muted-2` icon.

### Chips
There is no chip chrome. Suggested prompts are quiet text links: 14.5px ink-soft with a trailing muted chevron that nudges 2px on hover. Tech tags are one mono line joined with spaced middle dots.

### Cards / Containers
- **Corner Style:** 28px for stage tiles, 18px for source and impact cards.
- **Background:** `tile` on `stage`.
- **Shadow Strategy:** none (see the Flat Tile Rule).
- **Border:** none on tiles. Rows use a top hairline.
- **Internal Padding:** 24px mobile and 56px wide on stage tiles (vertical 48 to 80px), 20 to 24px on cards.

### Inputs / Fields
- **Style:** the ask field is a 64px `tile` pill with 17px text, a 28px left inset and the send button nested inside.
- **Focus:** the fill turns to `stage` with a 1px `hairline-strong` ring. Keyboard focus-visible gets a 2px ink ring. The sticky follow-up bar is a 44px frosted pill with the same focus ring.
- **Disabled:** 40% opacity on text controls. The send button goes to `sunk`.

### Navigation
- **Header:** sticky, 48px tall, frosted `nav-glass` with a hairline bottom edge. The wordmark sits left, and the links sit right in 13px ink-soft that goes to ink on hover. A hairline divider comes next, then the mono ⌘K pill (28px, 11px) and the theme toggle.
- **Chapter nav (Chrysa):** sticky at 96px, with a left hairline rail and 14px items. The current chapter gets a solid ink rail segment and medium weight, and the rest are muted.
- **Footer:** a hairline top edge, 13px, with a muted colophon and two ink-soft link columns.
- **Command palette:** a 600px dialog with a 22px radius on `stage` and a `hairline-strong` ring, a 17px search input, 12px muted group labels and 12px-radius rows.

### Segmented Control
One sliding thumb picks the answer's voice. It is a `tile` pill track with 3px padding. The `stage` thumb (`sunk` in dark mode) has a hairline ring and slides on the stage ease over 500ms. The active label is ink and the rest are muted. A 13px muted blurb sits beneath. The answer's TL;DR / Impact / Code / Story tab strip is the same control at 13px.

### Citation Marker and Source Rail (signature)
Footnotes are the evidence layer. An inline marker is an 18px indigo-wash pill holding a mono 10.5px tabular number. On hover it fills solid indigo with `indigo-ink` text, and after 150ms it shows a 288px inverted tooltip (ink fill, 14px radius). Source cards (18px, `tile`) carry a mono tabular number in a 28px gutter. The active card gets a 2px inset indigo ring and an indigo number. The card's excerpt and source links are indigo because they belong to the citation apparatus.

### Commit Graph (signature)
A stage tile with a headline statement over a 53-week grid of 3px-radius square cells, 3 to 4px apart. The five levels run from `sunk` to `indigo`, mixed in OKLab. A 13px muted legend sits beneath.

### Stage Reveal (signature motion)
A statement rises 28px, un-blurs from 10px and fades in. Opacity and blur run for 900ms and the transform for 1100ms, all on `cubic-bezier(0.22, 1, 0.36, 1)`, with an 80 to 320ms stagger inside a stage. The first stage plays from CSS on load, and later stages play once on intersection. Content renders visible by default, and reduced motion disables the reveal. A new chat answer uses the same grammar at a smaller scale (slide-in: 18px, 0.985 scale, 700ms).

### Live Dot
A 7px indigo circle that pulses to 0.6 scale every 2.6s. It is used only for current role and availability. The chat thinking dot is the same mark at 1.4s.

### Toast
An inverted ink pill at the bottom centre, 15px, up to 480px wide, shown for 3.2s.

## Do's and Don'ts

### Do:
- **Do** give every stage one statement at headline scale (700, -0.04em) with a muted lede beneath, capped at about 36ch.
- **Do** put meta lines (kind · year, dates, location) below the title in muted 15px.
- **Do** make links and primary buttons ink (fg). Links are underlined with a `hairline-strong` decoration that goes to ink on hover.
- **Do** reserve indigo for citations, the active footnote, the commit graph, focus and the live dot.
- **Do** lift surfaces only by tone: `tile` on `stage`, with 28px corners for stage tiles.
- **Do** use the stage ease (`cubic-bezier(0.22, 1, 0.36, 1)`) for every transition, and use the stage reveal as the only entrance.
- **Do** keep Geist Mono to code, tech tags, keyboard hints and footnote numbers.
- **Do** honour `prefers-reduced-motion` and keep content visible without JS.

### Don't:
- **Don't** put an eyebrow, kicker or uppercase label above a heading.
- **Don't** put stat or metric pairs on project rows.
- **Don't** use tabular figures in display numbers. Use them only in tables, dates and footnote numbers.
- **Don't** give tiles, cards or dialogs a shadow, and don't use gradients.
- **Don't** colour links, buttons or decoration indigo.
- **Don't** add a serif, a cream or paper tint, or a card-grid layout.
- **Don't** add a second accent. Love mode replaces the indigo; it never joins it.
