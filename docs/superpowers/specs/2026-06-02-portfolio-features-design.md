# Portfolio Features — Design Spec

**Date:** 2026-06-02
**Status:** Approved (design), pending implementation plan
**Scope:** Three independent features on the reverse-resume portfolio site.

## Overview

Three independent additions to the existing Next.js 15 / Vercel / Neon-Postgres portfolio:

1. **GitLab live refresh** — make the activity graph update without a redeploy (ISR).
2. **Three.js knowledge graph** — an ambient 3D visual in the chat's empty right column.
3. **`/about` page** — a dedicated page for recruiters who want the facts without chatting.

These share no state and can be built in any order. Recommended order: `/about` → Three.js → GitLab.

## Shared constraints

- **Bundle budget is sacred.** Home route First Load JS is ~50 kB today. Nothing here adds to the initial bundle of the home route beyond a tiny lazy-load trigger.
- **Graceful fallback everywhere.** No feature may hard-fail the page: no network → committed snapshot; no WebGL → text; no photo → no avatar.
- **Reuse existing patterns:** gray-matter MDX loaders (mirror `lib/content/projects.ts` / `now.ts`), card style `rounded-[12px] border border-border bg-bg-elev`, mono uppercase labels (`font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted`), accent CSS token, light/dark via existing tokens.

## Non-goals

No CMS or auth. No truly-live (sub-day) GitLab updates. No Three.js on mobile. No new DB tables. No new external services or cron jobs.

---

## Feature 1 — GitLab live refresh (ISR)

**Problem.** `components/projects/commit-graph.tsx` statically imports `content/generated/gitlab-calendar.json`, baked at build time by the `scripts/fetch-gitlab-calendar.ts` prebuild step. The graph is only as fresh as the last deploy.

**Approach.** Incremental Static Regeneration — no cron, no DB, no client JS.

- **`lib/gitlab-calendar.ts`** (new, pure): extract the date-map → weeks-grid transform and `total` computation out of `scripts/fetch-gitlab-calendar.ts` so the build script and the runtime fetch produce byte-identical shapes. Pure, unit-testable, no I/O.
- **`lib/gitlab.ts`** (new): `getGitlabCalendar()` does `fetch("https://gitlab.com/users/harshit_sindhu/calendar.json", { next: { revalidate: 21600 } })` (6 h). On success → transform via `lib/gitlab-calendar.ts`. Next.js refreshes in the background on traffic.
- **Fallback chain:** live fetch → committed `content/generated/gitlab-calendar.json` snapshot → seed. Any non-200, bad payload shape, or thrown error falls through to the next tier so the graph always renders last-good data.
- **`commit-graph.tsx`** becomes an `async` server component awaiting `getGitlabCalendar()` instead of the static import. **Remains zero client JS.** The caption reflects the source: `live` when fetched fresh, `snapshot {date}` when falling back.
- The prebuild script (`scripts/fetch-gitlab-calendar.ts`) stays as the committed-snapshot generator and now imports the shared transform.

**Testing.** Unit-test the transform and the fallback chain (mocked fetch → live / non-200 / malformed / network-throw all resolve to a valid grid).

---

## Feature 2 — Three.js knowledge graph (ambient empty-state visual)

**Problem.** The chat's right column (`SourcesRail`, 320 px, desktop-only via `md:grid-cols-[1fr_320px]`) is nearly empty before the first question — only "Citations will appear here…". Fill it with an on-theme ambient visual that yields to citations.

**Approach.**

- **`components/chat/knowledge-graph.tsx`** (new, client component) loaded via `next/dynamic(() => ..., { ssr: false })`, **rendered desktop-only (md+)** and **mounted after `requestIdleCallback`** (fallback `setTimeout`). Result: three.js (~150 kB) is fully code-split — never in the initial bundle, never shipped to mobile, never blocks first paint.
- **Raw three.js**, a single small self-contained scene module (not react-three-fiber) to keep the code-split chunk lean for a simple graph. Scene is created on mount and disposed on unmount (geometries, materials, renderer, RAF loop, resize + pointer listeners all cleaned up).
- **`lib/graph-data.ts`** (new): a static node/edge list derived from the real corpus — center node `me` → repo nodes (`reverse-resume`, `job-mcp`, `sla-engine`, `outbox-dispatcher`, `pro-shop`) → a few theme/snippet leaf nodes. Honest to what's indexed; small enough to be a literal.
- **Behavior:** slow auto-rotation, gentle per-node drift, faint glowing edges, subtle cursor parallax. Color from the accent CSS token; reads correctly in light and dark.
- **Placement & lifecycle:** rendered only inside the `SourcesRail` empty branch (`citations.length === 0`). The moment `citations.length > 0`, citation cards replace it (it unmounts/fades). It never coexists with citations.
- **Fallbacks:** `prefers-reduced-motion` → render a single static frame (no RAF loop). WebGL unavailable / context creation fails → render the existing "Citations will appear here as the answer streams." text.

**Testing.** Assert the SSR/markup fallback text is present (component is `ssr:false`, so server markup must still show the citations-empty text). Verify the reduced-motion branch skips the animation loop. (Full visual behavior is not unit-tested.)

---

## Feature 3 — `/about` page (single-column, Layout A)

**Problem.** No path for someone who wants the facts (where he's worked, what he does, links) without using the chat.

**Approach.** A dedicated `/about` route.

- **`app/about/page.tsx`** — server component. Header and the `max-w-5xl` container come from `app/layout.tsx` automatically; the page renders its own `<Footer />` (matching the home page).
- **Layout A — single narrow column** `max-w-[640px] mx-auto`. Block order:
  1. Optional photo avatar (conditional)
  2. Intro / bio (hand-written prose)
  3. Work timeline
  4. Skills / tech focus
  5. Achievements (compact)
  6. Links + résumé download button + "Prefer to ask? →" link back to the home chat
- **Content sourcing:**
  - **`content/about.mdx`** (new, hand-written): frontmatter `name`, `tagline`, optional `photo` (public path), `skills` (grouped: Languages / Backend / Frontend / Databases / AI), `achievements[]`, `links` (GitHub, LinkedIn, LeetCode, email, résumé). Body = bio prose.
  - **`lib/content/experience.ts`** (new): zod-validated gray-matter loader mirroring `lib/content/projects.ts`, reading `content/experience/*.mdx` frontmatter (`role`, `employer`, `dates`, `location`, `stack`). Sorted most-recent first. **Excludes** the `Personal` position-paper entry (`stack-philosophy.mdx`). DTU education renders as the final timeline entry.
  - **Skills** read from `content/about.mdx` frontmatter (resume taxonomy), not hard-coded in the component.
  - **Photo conditional:** `photo` frontmatter present → rounded `next/image`; absent → column starts at the bio, layout still correct.
- **New components** under `components/about/`: `work-timeline.tsx`, `skill-groups.tsx` (reuse card style + mono labels). `about.mdx` bio body rendered via the existing `MarkdownMessage` / MDX prose path.
- **`components/header.tsx`** gains an "About" text link (`next/link` to `/about`).

**Testing.** `experience.ts` zod validation + sort order (vitest). `/about` renders correctly **with and without** a `photo` value. e2e: `/about` loads, has the page heading + a résumé link, and the header "About" link navigates there.

---

## File summary

**New**
- `lib/gitlab-calendar.ts` — shared pure transform
- `lib/gitlab.ts` — `getGitlabCalendar()` ISR fetch + fallback chain
- `lib/graph-data.ts` — static node/edge list
- `lib/content/experience.ts` — zod gray-matter experience loader
- `components/chat/knowledge-graph.tsx` — client, dynamic, desktop-only
- `components/about/work-timeline.tsx`
- `components/about/skill-groups.tsx`
- `app/about/page.tsx`
- `content/about.mdx`

**Modified**
- `components/projects/commit-graph.tsx` — async server component, ISR data source
- `scripts/fetch-gitlab-calendar.ts` — import shared transform
- `components/chat/sources-rail.tsx` — render knowledge graph in empty branch
- `components/header.tsx` — "About" nav link
