---
title: About Page Redesign — editorial profile (hero + logo timeline + skills + achievements + CTA)
date: 2026-06-03
status: approved
source: Claude Design handoff (Downloads/personal (1)/design_handoff_about_page)
relates-to: 2026-05-20-portfolio-redesign-design.md
---

# About Page Redesign

## Goal

Rebuild `/about` from the current minimal 640px-wide page ([app/about/page.tsx](../../../app/about/page.tsx))
into the five-section editorial profile from the design handoff: a full-width **hero** (eyebrow +
availability + giant serif name + two-column lede/aside + 4-cell stat strip), a logo-led
**experience & education timeline**, a **skills** matrix, an **achievements** list, and a closing
**CTA card**. Stays fully data-driven from MDX and reuses the site's existing chrome (header,
footer, ⌘K palette, theme toggle) and design tokens.

## Context: what already exists

The earlier "Portfolio Redesign" milestone ([2026-05-20-portfolio-redesign-design.md](2026-05-20-portfolio-redesign-design.md))
already shipped the entire visual system the handoff asks for:

- Tokens (warm-paper light + near-black dark, green accent, love-mode) in [app/globals.css](../../../app/globals.css) — **match the handoff exactly**.
- Fonts (Cormorant Garamond / Geist / JetBrains Mono) via `next/font` in [app/layout.tsx](../../../app/layout.tsx).
- Dark-default + no-flash pre-paint script (keyed on `localStorage.theme`).
- ⌘K command palette, theme toggle, header, footer — all reused untouched.
- `pulse-dot` keyframe + `prefers-reduced-motion` killswitch already in globals.css.

So the handoff's "Implementation checklist" items 1, 2, 8 are **done**. This spec covers only the
About page itself plus three small touch-ups (data schema, one client wrapper, footer About link).

## Constraints

- Stay inside Next.js 15 / App Router / Tailwind v3 / MDX-content model. No new deps, no infra.
- Keep content data-driven (MDX + zod), matching the codebase convention.
- Reuse existing tokens, header, footer, palette, theme toggle unchanged.
- Must look correct at **all viewports** (desktop → mobile), with the responsive breakpoints below.
- `prefers-reduced-motion` honored: reveal elements show immediately, dots stop pulsing.

## Approach

Extend the existing data-driven model (chosen over cloning the prototype's all-inline JSX, which
would break the MDX convention). Content lives in MDX; zod schemas gain a few fields; new
presentational components render it; one small client component handles scroll-reveal. Pulsing
dots are pure CSS. Everything else stays a server component.

---

## Data model changes

### `lib/content/experience.ts` — `ExperienceFrontmatter`

The experience MDX files are long-form and have none of the timeline's display fields. Add:

```ts
kind:    z.enum(["Full-time", "Internship", "Education"]).optional(),
summary: z.string().min(1).max(400).optional(),   // one-line timeline blurb (≠ long body)
logo:    z.string().min(1).max(200).optional(),    // e.g. "/logos/zykrr.svg"
```

- **Current-role highlight** and the "Currently" badge are *derived* — `dates` contains
  `"present"` (case-insensitive). No new field.
- Existing fields unchanged. The loader already returns exactly the 3 entries the timeline
  needs (Zykrr, Engineers India, DTU), newest-first.

### `lib/content/about.ts` — `AboutFrontmatter`

Add the hero fields; **drop the long bio body** from the page (hero lede + support + stats
replace it; deep detail lives in the chat). The MDX body stays in the file but is no longer
rendered on `/about`.

```ts
location:     z.string().min(1).max(80),
availability: z.string().min(1).max(60).optional(),   // "Open to opportunities"
lede:         z.string().min(1).max(400),             // *word* marks green-italic emphasis
support:      z.string().min(1).max(500),
stats: z.array(z.object({
  num:  z.string().min(1).max(8),                      // "~2", "100+", "400+", "5"
  unit: z.string().max(4).optional(),                  // "yrs", "★"
  cap:  z.string().min(1).max(60),
})).length(4),
```

`tagline`, `resumeUrl`, `skills`, `achievements`, `links`, `photo?` unchanged. `BioProse`
component is retired from this page (file may be deleted or left unused — kept out of the render).

---

## Draft copy (for your review)

> This is the "sharper copy" pass. Edit anything inline before we build — it all lands in MDX.

### Hero
- **eyebrow:** `About`
- **availability pill:** `Open to opportunities`
- **name:** `Harshit Sindhu`
- **lede** (emphasis in *italic*): *I own the* **backend half** *of B2B platforms — schema design,
  100+ APIs, and the event-driven machinery that keeps data* **correct under load.**
  (stored as: `I own the *backend half* of B2B platforms — schema design, 100+ APIs, and the event-driven machinery that keeps data *correct under load*.`)
- **support:** At Zykrr I work across a customer-experience analytics platform: an SLA engine with
  multi-level escalation, a transactional outbox spanning core entities, and the Redis cache behind
  every entitlement check — plus the Next.js screens that consume them.
- **meta chips:** `📍 New Delhi, India` · `💼 Software Developer @ Zykrr` · `</> TypeScript, end-to-end`

### Stat strip (4)
| num | unit | caption |
|---|---|---|
| ~2 | yrs | building B2B platforms in production |
| 100+ | | REST APIs designed & shipped |
| 400+ | | DSA problems solved |
| 5 | ★ | Problem Solving on HackerRank |

### Timeline summaries
1. **Zykrr** — *Full-time · 2024 — present · Software Developer · New Delhi, India* (current,
   highlighted): "Designed and shipped core backend — schema design, 100+ REST APIs, an SLA
   engine with multi-level escalation, a transactional outbox across entities, and Redis-backed
   entitlement checks — plus the React/Next.js screens that consume them."
   tags = existing `stack`: TypeScript, Node.js, NestJS, PostgreSQL, TypeORM, Redis, BullMQ, React, Next.js.
2. **Engineers India Limited** — *Internship · 2022 · Engineering Intern · New Delhi, India*:
   "An engineering internship at a public-sector consultancy — first real exposure to large-scale
   systems and disciplined documentation." no tags.
3. **Delhi Technological University** — *Education · 2020 — 2024 · B.Tech, Computer Engineering ·
   New Delhi, India*: "Computer Engineering — data structures, systems, and databases alongside
   competitive programming." no tags.

### Skills (kept from current about.mdx — 5 groups; handoff had 4, we keep the AI/Agents group)
- **Languages** — JavaScript, TypeScript, Python, C++, SQL
- **Backend** — Node.js, NestJS, Express, REST APIs, SSE, BullMQ
- **Frontend** — React, Next.js, Redux, Tailwind CSS
- **Databases & Caching** — PostgreSQL, pgvector, Redis, MongoDB, Drizzle ORM, TypeORM
- **AI / Agents** — Anthropic SDK, Model Context Protocol, Voyage embeddings, RAG

### Achievements (kept — already strong)
- Solved 400+ DSA problems across LeetCode, GeeksforGeeks, and CodeStudio.
- 5-star rated in Problem Solving on HackerRank.
- Completed Walmart USA Advanced Software Engineering virtual program (Forage, 2023).

### CTA card
- button: **Download résumé (PDF)** → `resumeUrl`
- links: GitHub · LinkedIn · LeetCode · Email
- sub-line: "Prefer to dig in? **Ask my work anything →**" (→ `/`)

---

## Components (`components/about/`)

All server components except `reveal.tsx`. Measurements/colors per the handoff README (it is
hi-fi); the values below are the contract.

| Component | Replaces | Notes |
|---|---|---|
| `section-head.tsx` | — | `01` (mono, accent) + serif title + flex-1 hairline rule. Rule hidden + title wraps ≤560px. |
| `about-hero.tsx` | inline hero in page | eyebrow + pulsing dot + availability pill; serif name `clamp(56px,9vw,104px)`; two-col `1.05fr 0.95fr` lede/aside → 1 col ≤760px; meta chips; support; 4-cell stat strip (4-up → 2-up ≤560px). |
| `logo-tile.tsx` | — | `<img object-contain>` on a **`#f6f4ee` light chip**, 64px (48px ≤560px), `rounded-[15px]`, width/height set; monogram text fallback when `logo` missing or `onError`. Hover lift via parent. |
| `logo-timeline.tsx` | `work-timeline.tsx` | grid `64px minmax(0,1fr)`; connector line between items; current-role accent highlight (`--accent-soft` gradient + left border, pulled into gutter); kind badge, period, "Currently" badge, role, org·location, summary, tags. |
| `skill-stack.tsx` | `skill-groups.tsx` | bordered chip cards; chip hover reveals border + darkens text. |
| `achievements.tsx` | inline list in page | `arrow-right` marker + text rows, hairline separators. |
| `cta-card.tsx` | inline section in page | primary résumé button (52px, accent, `file` icon, hover lift/brighten) + links + sub-line with sliding `→`. |
| `reveal.tsx` | — | **client.** IntersectionObserver (`rootMargin: "0px 0px -8% 0px"`, `threshold 0.08`, unobserve after firing). Wraps each section; reduced-motion → immediate show. |
| `icons.tsx` | — | 5 inline line icons: `pin`, `briefcase`, `code`, `arrow-right`, `file` (24×24, `stroke: currentColor`, `stroke-width 1.6`), matching the header/footer SVG style. |

Retired from the page: `work-timeline.tsx`, `skill-groups.tsx`, `bio-prose.tsx` (the latter no
longer rendered on `/about`).

### `app/about/page.tsx` (rewrite)
Server component. Loads about + experience, composes:
`<AboutHero/>` → `<Reveal><section 01: SectionHead + LogoTimeline/></Reveal>` →
`<Reveal>02: SectionHead + SkillStack/></Reveal>` → `<Reveal>03: SectionHead + Achievements/></Reveal>`
→ `<Reveal><CtaCard/></Reveal>` → `<Footer/>`. Section ids `experience` / `skills` / `achievements`
with `scroll-mt` for palette jumps.

### CSS (`app/globals.css` — new `About` block)
Tailwind handles most styling; the fiddly bits go in a scoped CSS block (matching the existing
constellation / commit-graph convention):
- timeline connector line (absolute vertical gradient `--border-strong → transparent`)
- current-role highlight (`linear-gradient(90deg, var(--accent-soft), transparent 62%)` + left accent border, negative gutter margin)
- stat-cell vertical dividers (`::before` hairlines)
- `.reveal` start-state inside `@media (prefers-reduced-motion: no-preference)` only (print/no-JS shows content)

---

## Logos: how they get added to the code

1. Create **`public/logos/`** and drop in `zykrr.svg`, `engineers-india.svg`, `dtu.svg`
   (SVG preferred; PNG ≥128px square also fine).
2. In each experience MDX frontmatter, set `logo: "/logos/zykrr.svg"` (etc.).
3. `logo-tile.tsx` renders the file on a fixed-size **light `#f6f4ee` chip** with `object-contain`,
   explicit width/height (no layout shift), and a **monogram fallback** ("Z" / "EIL" / "DTU") shown
   when `logo` is absent or fails to load.

→ The page ships working with monogram fallbacks today and upgrades to real logos the instant the
files exist — **no code change needed** to swap them in.

---

## Mobile nav (new requirement)

The header About link is `hidden sm:inline-flex` — unreachable on mobile. Add an **About link to the
footer** ([components/footer.tsx](../../../components/footer.tsx)) link row so it's reachable on every
page at every viewport. (Footer chosen over un-hiding the header link, which is cramped on mobile
beside the social icons + ⌘K pill + toggle.)

## ⌘K palette additions

Add About-section jump commands ("Jump to Experience / Skills / Achievements") to the existing
palette, alongside the current Navigate group. Uses the same smooth-scroll-to-id pattern.

## Responsive plan (all viewports)

| Breakpoint | Behavior |
|---|---|
| ≤760px | hero two-column → one column; lede above aside |
| ≤720px | container padding 36px → 22px (or shell `px-6` equiv) |
| ≤560px | stat strip 4-up → 2-up; section-title rule hidden + title wraps; logo tile 64→48px, timeline gap/padding tighten |
| width | About fills the existing `max-w-5xl` shell (≈976px content) for cohesion with the home page; no horizontal overflow at any width |

## Testing

- `lib/content/about.test.ts` — new fields validate; `stats` requires exactly 4; bad `lede`/missing `location` rejected.
- `lib/content/experience.test.ts` — `kind` enum, optional `summary`/`logo` parse; current-role derivation from `dates` "present".
- `components/about/logo-tile.test.tsx` — renders `<img>` when `logo` set; renders monogram fallback when absent.
- `components/about/reveal.test.tsx` — reduced-motion shows children immediately; observer fires once.
- e2e `e2e/about.spec.ts` — five sections render; ⌘K jumps to sections; footer About link navigates from mobile viewport.
- Visual regression (Playwright `toHaveScreenshot`): hero, timeline, skills, achievements, CTA — light + dark, desktop + mobile.

## Out of scope

- Tweaks panel (design-tool artifact; already excluded in the prior milestone).
- Re-introducing a portrait/avatar (removed by request in the handoff).
- Any change to the chat / RAG / retrieval pipeline.
- Changing the global layout shell width for other pages.
