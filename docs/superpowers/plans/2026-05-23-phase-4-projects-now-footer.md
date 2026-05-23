# Phase 4 — Projects + Now + Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the editorial portfolio's three lower sections on top of the Phase 1–3 chat surface: (1) a **Projects** grid driven by MDX frontmatter and topped with a 53×7 **GitLab activity graph** built from a build-time snapshot; (2) a four-card **Now** strip driven by a single MDX file; (3) a real **Footer** component extracted out of `app/page.tsx`. Zero new dependencies (gray-matter, zod, tsx all already shipped in Phase 0–3). The whole page stays predominantly server-rendered — CommitGraph in particular is server-only with zero client JS.

**Architecture:** Three layers move together — (1) **content loaders** (`lib/content/projects.ts`, `lib/content/now.ts`) read MDX off disk via `gray-matter` and validate frontmatter via zod, mirroring the existing `app/page.tsx::loadLanding()` pattern; (2) **GitLab calendar pipeline** (`scripts/fetch-gitlab-calendar.ts` + `content/generated/gitlab-calendar.json`) is a prebuild step that always exits 0 — fresh fetch on success, committed snapshot on transient failure, deterministic seeded pattern on first-ever run with no snapshot — gated by `package.json::prebuild` with the `|| echo` fallback; (3) **server components** in `components/projects/*` and `components/now/*` consume the loaders, plus `components/footer.tsx` extracted from `app/page.tsx`. `app/page.tsx` becomes a 4-section composition: `<ChatShell/> → <ProjectsSection/> → <NowStrip/> → <Footer/>`.

**Tech Stack:** Next.js 15 App Router server components, `gray-matter` (already a dep), `zod` (already a dep), `tsx` (already a dep) for the build-time fetcher, plain `fetch()` against `https://gitlab.com/users/harshit_sindhu/calendar.json`, vitest. No new client JS — every component is RSC except where the existing chat already requires `"use client"`.

---

## File Structure

**Create:**
- `lib/content/projects.ts` — `loadProjects()`, zod `ProjectFrontmatter`, sort `(year desc, order asc)`
- `lib/content/projects.test.ts` — frontmatter validation + sort
- `lib/content/now.ts` — `loadNow()`, zod `NowFrontmatter`
- `lib/content/now.test.ts` — frontmatter validation
- `content/projects/reverse-resume.mdx` — seed (this site)
- `content/projects/sla-engine.mdx` — seed
- `content/projects/outbox-dispatcher.mdx` — seed
- `content/projects/pro-shop.mdx` — seed
- `content/now.mdx` — seed (4 items)
- `scripts/fetch-gitlab-calendar.ts` — fetch GitLab JSON → bucket 53×7 → write snapshot, always exits 0
- `content/generated/gitlab-calendar.json` — first run output (committed)
- `components/projects/commit-graph.tsx` — server component, imports JSON at module load
- `components/projects/project-card.tsx` — server component
- `components/projects/projects-grid.tsx` — server component
- `components/projects/projects-section.tsx` — server component (orchestrator)
- `components/now/now-card.tsx` — server component
- `components/now/now-strip.tsx` — server component
- `components/footer.tsx` — server component, extracted from `app/page.tsx`

**Modify:**
- `package.json` — add `"prebuild": "tsx scripts/fetch-gitlab-calendar.ts || echo 'using cached calendar'"`
- `app/page.tsx` — replace inline footer with `<Footer/>`; insert `<ProjectsSection/>` and `<NowStrip/>` between `<ChatShell/>` and `<Footer/>`

**No rename / no delete.**

---

## Task 1: Create `lib/content/projects.ts` + test

**Files:**
- Create: `lib/content/projects.ts`
- Create: `lib/content/projects.test.ts`

Mirrors the existing `app/page.tsx::loadLanding()` pattern but for a directory of MDX files. Frontmatter is the source of truth — MDX body is optional supplemental copy (we don't render it on the card). Sort: `year desc, order asc`. `order` is optional (default = `Number.MAX_SAFE_INTEGER`) so frontmatter without `order` falls to the back within the same year.

- [ ] **Step 1: Write the failing test**

Create `lib/content/projects.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadProjectsFrom, ProjectFrontmatter } from "./projects";

describe("lib/content/projects", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "rr-projects-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, frontmatter: string, body = "") {
    writeFileSync(join(dir, name), `---\n${frontmatter}\n---\n${body}\n`);
  }

  it("parses a valid entry", () => {
    write(
      "rr.mdx",
      `title: "Reverse Resume"
slug: "reverse-resume"
year: "2026"
kind: "Side project"
status: "live"
description: "RAG over my own work history."
tags: ["TypeScript", "Next.js"]
stats:
  - { label: "Repos indexed", val: "4" }
url: "https://example.com"
order: 1`
    );
    const projects = _loadProjectsFrom(dir);
    expect(projects).toHaveLength(1);
    expect(projects[0].slug).toBe("reverse-resume");
    expect(projects[0].kind).toBe("Side project");
    expect(projects[0].stats[0]).toEqual({ label: "Repos indexed", val: "4" });
  });

  it("sorts by year desc, then order asc", () => {
    write("a.mdx", `title: "A"\nslug: "a"\nyear: "2024"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 2`);
    write("b.mdx", `title: "B"\nslug: "b"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 2`);
    write("c.mdx", `title: "C"\nslug: "c"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 1`);
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["c", "b", "a"]);
  });

  it("defaults order to MAX_SAFE_INTEGER so unordered entries land last within a year", () => {
    write("a.mdx", `title: "A"\nslug: "a"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    write("b.mdx", `title: "B"\nslug: "b"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 1`);
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["b", "a"]);
  });

  it("throws on invalid kind", () => {
    write("bad.mdx", `title: "X"\nslug: "x"\nyear: "2026"\nkind: "Hot Garbage"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    expect(() => _loadProjectsFrom(dir)).toThrow();
  });

  it("validates ProjectFrontmatter zod schema directly", () => {
    const result = ProjectFrontmatter.safeParse({
      title: "T", slug: "t", year: "2026", kind: "OSS", status: "archived",
      description: "d", tags: ["a"], stats: [], url: "https://x", order: 1,
    });
    expect(result.success).toBe(true);
  });

  it("skips non-MDX files in the directory", () => {
    write("ok.mdx", `title: "OK"\nslug: "ok"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    writeFileSync(join(dir, "README.md"), "# nope");
    writeFileSync(join(dir, ".DS_Store"), "junk");
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["ok"]);
  });
});
```

- [ ] **Step 2: Run test (expect failure — module not found)**

Run: `pnpm vitest run lib/content/projects.test.ts`
Expected: FAIL — `Cannot find module './projects'`.

- [ ] **Step 3: Implement `lib/content/projects.ts`**

```ts
// lib/content/projects.ts
//
// Loads content/projects/*.mdx, validates frontmatter via zod, sorts by
// (year desc, order asc). Mirrors the existing app/page.tsx::loadLanding()
// pattern. Frontmatter is the source of truth; MDX body is optional
// supplemental copy that we don't render on cards.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const ProjectStat = z.object({
  label: z.string().min(1).max(40),
  val: z.string().min(1).max(20),
});

export const ProjectFrontmatter = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  year: z.string().regex(/^\d{4}$/),
  kind: z.enum(["Side project", "OSS", "Bootstrapped", "Experiment"]),
  status: z.enum(["live", "archived"]),
  description: z.string().min(1).max(400),
  tags: z.array(z.string().min(1).max(40)).max(12),
  stats: z.array(ProjectStat).max(6).default([]),
  url: z.string().url().optional(),
  order: z.number().int().optional(),
});

export type ProjectFrontmatterT = z.infer<typeof ProjectFrontmatter>;

function sortProjects(a: ProjectFrontmatterT, b: ProjectFrontmatterT): number {
  if (a.year !== b.year) return b.year.localeCompare(a.year); // year desc
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  return ao - bo;
}

// Exported for tests — accepts a directory argument so tmpdirs can be used.
export function _loadProjectsFrom(dir: string): ProjectFrontmatterT[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const projects = files.map((f) => {
    const raw = readFileSync(join(dir, f), "utf-8");
    const parsed = ProjectFrontmatter.parse(matter(raw).data);
    return parsed;
  });
  return projects.sort(sortProjects);
}

export function loadProjects(): ProjectFrontmatterT[] {
  return _loadProjectsFrom(join(process.cwd(), "content/projects"));
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `pnpm vitest run lib/content/projects.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/content/projects.ts lib/content/projects.test.ts
git commit -m "feat(content): projects loader — zod-validated frontmatter, year/order sort

readFileSync + gray-matter mirror of app/page.tsx::loadLanding() but over a
directory. ProjectFrontmatter validates the 9 fields the spec calls for;
sort is (year desc, order asc) with order defaulting to MAX_SAFE_INTEGER so
unordered entries land last within a year. Tests cover the four interesting
states: round-trip, sort order, default-order behavior, invalid kind."
```

---

## Task 2: Create `lib/content/now.ts` + test

**Files:**
- Create: `lib/content/now.ts`
- Create: `lib/content/now.test.ts`

Single MDX file (`content/now.mdx`) → array of items. The `kind` enum picks the icon at render time. No body rendering — frontmatter is the whole truth.

- [ ] **Step 1: Write the failing test**

Create `lib/content/now.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadNowFrom, NowFrontmatter } from "./now";

describe("lib/content/now", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "rr-now-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeNow(frontmatter: string) {
    writeFileSync(join(dir, "now.mdx"), `---\n${frontmatter}\n---\n`);
  }

  it("parses a valid 4-item Now file", () => {
    writeNow(
      `updated: "2026-05-20"
items:
  - { kind: "Building",  title: "Reverse Resume",   desc: "RAG over my work history." }
  - { kind: "Reading",   title: "DDIA",             desc: "Re-read." }
  - { kind: "Learning",  title: "Rust ownership",   desc: "Small TUI." }
  - { kind: "Listening", title: "Signals & Threads", desc: "Jane Street podcast." }`
    );
    const now = _loadNowFrom(dir);
    expect(now.updated).toBe("2026-05-20");
    expect(now.items).toHaveLength(4);
    expect(now.items[0].kind).toBe("Building");
  });

  it("rejects unknown kinds", () => {
    writeNow(`updated: "2026-05-20"
items:
  - { kind: "Vibing", title: "x", desc: "y" }`);
    expect(() => _loadNowFrom(dir)).toThrow();
  });

  it("requires at least one item", () => {
    writeNow(`updated: "2026-05-20"
items: []`);
    expect(() => _loadNowFrom(dir)).toThrow();
  });

  it("validates NowFrontmatter zod schema directly", () => {
    const result = NowFrontmatter.safeParse({
      updated: "2026-05-20",
      items: [{ kind: "Building", title: "T", desc: "D" }],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test (expect failure)**

Run: `pnpm vitest run lib/content/now.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/content/now.ts`**

```ts
// lib/content/now.ts
//
// Loads content/now.mdx — a single MDX file whose frontmatter holds an
// `updated` date and 1+ items keyed by kind. The body is intentionally
// ignored — the strip renders from frontmatter alone.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const NowItem = z.object({
  kind: z.enum(["Building", "Reading", "Learning", "Listening"]),
  title: z.string().min(1).max(80),
  desc: z.string().min(1).max(280),
});

export const NowFrontmatter = z.object({
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(NowItem).min(1).max(6),
});

export type NowFrontmatterT = z.infer<typeof NowFrontmatter>;

export function _loadNowFrom(dir: string): NowFrontmatterT {
  const raw = readFileSync(join(dir, "now.mdx"), "utf-8");
  return NowFrontmatter.parse(matter(raw).data);
}

export function loadNow(): NowFrontmatterT {
  return _loadNowFrom(join(process.cwd(), "content"));
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `pnpm vitest run lib/content/now.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/content/now.ts lib/content/now.test.ts
git commit -m "feat(content): now loader — zod-validated single-file frontmatter

content/now.mdx holds {updated, items[1..6]} where each item is
{kind, title, desc}. Kind drives the icon at render time. Body is
intentionally unused — frontmatter is the whole truth for the strip."
```

---

## Task 3: Seed `content/projects/*.mdx` (4 entries)

**Files:**
- Create: `content/projects/reverse-resume.mdx`
- Create: `content/projects/sla-engine.mdx`
- Create: `content/projects/outbox-dispatcher.mdx`
- Create: `content/projects/pro-shop.mdx`

Pulled from `content/experience/*.mdx` where possible. User will replace in Phase 5b — the goal here is to have plausible content so the page renders and the loader has something to validate.

- [ ] **Step 1: Create `content/projects/reverse-resume.mdx`**

```mdx
---
title: "Reverse Resume"
slug: "reverse-resume"
year: "2026"
kind: "Side project"
status: "live"
description: "Citation-grounded RAG over my own work history. Every answer cites real code or real production experience — no marketing, just verifiable evidence."
tags: ["TypeScript", "Next.js", "Postgres", "RAG", "Anthropic"]
stats:
  - { label: "Repos indexed",   val: "4" }
  - { label: "Snippets",         val: "30+" }
  - { label: "Eval score",       val: "1.0" }
url: "https://github.com/HArshit123455/reverse-resume"
order: 1
---

The site you're reading is itself the project. Pgvector retrieval, Voyage embeddings, Sonnet streaming with inline citations, audience-aware voice steering, and lazy-loaded answer tabs (Impact / Code / Story).
```

- [ ] **Step 2: Create `content/projects/sla-engine.mdx`**

```mdx
---
title: "SLA engine with multi-level escalation"
slug: "sla-engine"
year: "2025"
kind: "Experiment"
status: "live"
description: "Queue-driven service that watches ticket events and enforces SLA policies. The L0 → L1 flip on breach is a one-way ratchet — resolved, closed, cancelled, and already-escalated tickets are deliberately not clobbered."
tags: ["NestJS", "BullMQ", "PostgreSQL", "TypeORM"]
stats:
  - { label: "Escalation levels", val: "4" }
  - { label: "Status machine",    val: "9-state" }
url: ""
order: 1
---

Resolves policies per ticket priority, computes target times with a business-hours-aware delay calculator, persists SLA instances, and publishes breach transitions back as domain events. Listener picks up upstream events; processor runs as a BullMQ job with retry semantics.
```

- [ ] **Step 3: Create `content/projects/outbox-dispatcher.mdx`**

```mdx
---
title: "Transactional outbox across core entities"
slug: "outbox-dispatcher"
year: "2025"
kind: "Experiment"
status: "live"
description: "TypeORM subscribers fan domain mutations across five entity types into an outbox table inside the same transaction as the write. A separate dispatcher drains the outbox and publishes downstream — no event lost, no event published on rollback."
tags: ["TypeORM", "PostgreSQL", "Event-driven"]
stats:
  - { label: "Entities covered", val: "5" }
  - { label: "Subscribers",       val: "shared scaffolding" }
url: ""
order: 2
---

The standard transactional-outbox shape. What I owned was making it consistent across ticket, ticket-field, issue, case, case-field via one shared subscriber scaffold rather than five ad-hoc implementations.
```

- [ ] **Step 4: Create `content/projects/pro-shop.mdx`**

```mdx
---
title: "Pro-shop — MERN e-commerce"
slug: "pro-shop"
year: "2023"
kind: "Side project"
status: "archived"
description: "MERN-stack e-commerce store built during university to learn full-stack JavaScript end-to-end. PayPal sandbox wired through a real payment provider rather than faked. The project that made me commit to TypeScript end-to-end."
tags: ["MongoDB", "Express", "React", "Node.js", "PayPal"]
stats:
  - { label: "Stack age",     val: "2023" }
  - { label: "Real payments", val: "Sandbox" }
url: "https://github.com/HArshit123455/shop"
order: 1
---

First full CRUD app I built with a real third-party integration. Where I first felt the pain of untyped JS at the client/server boundary — a big part of why everything since is TypeScript.
```

- [ ] **Step 5: Run the loader test to confirm seed data parses**

Run: `pnpm vitest run lib/content/projects.test.ts`
Expected: PASS (the loader test uses tmpdirs, so seeds don't affect it — but the seed must be parseable; we'll catch any frontmatter typo when the page renders in Task 11).

Run a one-off sanity check:
```bash
node --input-type=module -e "import('./lib/content/projects.ts').then(m => console.log(m.loadProjects().map(p => p.slug)))"
```
Expected: `[ 'reverse-resume', 'sla-engine', 'outbox-dispatcher', 'pro-shop' ]` — but this requires ts loader; if it errors, defer the check to Task 11.

- [ ] **Step 6: Commit**

```bash
git add content/projects/
git commit -m "content: seed four project entries

Reverse Resume + three pulled from content/experience/*.mdx (Zykrr work).
All four validate against the lib/content/projects.ts zod schema. User
will replace/edit during Phase 5b content authoring."
```

---

## Task 4: Seed `content/now.mdx`

**Files:**
- Create: `content/now.mdx`

Four plausible items matching the spec's `kind` enum. User will replace in Phase 5b.

- [ ] **Step 1: Create the file**

```mdx
---
updated: "2026-05-20"
items:
  - { kind: "Building",  title: "Reverse Resume",                 desc: "Citation-grounded RAG over my own work — every claim cites real code." }
  - { kind: "Reading",   title: "Designing Data-Intensive Apps",  desc: "Re-read; different chapters hit differently each pass." }
  - { kind: "Learning",  title: "Rust ownership for real",        desc: "Small TUI to feel the borrow checker, not just read about it." }
  - { kind: "Listening", title: "Signals & Threads",              desc: "Jane Street's engineering podcast — production stories at scale." }
---

Replaced quarterly. Last updated 2026-05-20.
```

- [ ] **Step 2: Run the loader test**

Run: `pnpm vitest run lib/content/now.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add content/now.mdx
git commit -m "content: seed now strip — 4 items per spec

Plausible defaults across all 4 kinds (Building / Reading / Learning /
Listening). User replaces during Phase 5b."
```

---

## Task 5: Create `scripts/fetch-gitlab-calendar.ts`

**Files:**
- Create: `scripts/fetch-gitlab-calendar.ts`

A build-time script that **always exits 0**. On a successful fetch, it writes a fresh snapshot. On a fetch failure, it keeps the existing snapshot (if any) or writes a deterministic seed (if not). This is critical — the `prebuild` hook in Task 6 uses `|| echo` as a second safety net, but the script itself should not throw under any branch.

GitLab's calendar JSON shape is `{ "YYYY-MM-DD": count }`. We bucket into 53 weeks × 7 days ending on today, with `level` derived via fixed thresholds (0 / 1–3 / 4–7 / 8–15 / 16+) — the spec mentions quantiles as an alternative; we go fixed because thresholds are stable across reruns.

- [ ] **Step 1: Create the file**

```ts
// scripts/fetch-gitlab-calendar.ts
//
// Runs at build time via `prebuild`. Fetches GitLab's calendar.json,
// buckets to a 53-week × 7-day grid ending today, writes JSON. Always
// exits 0 — if the network fails AND no snapshot exists, falls back to
// a deterministic seeded pattern so the page still builds.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const OUT_PATH = join(process.cwd(), "content/generated/gitlab-calendar.json");

export interface CalendarCell {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarSnapshot {
  fetchedAt: string;        // ISO timestamp
  source: "gitlab" | "snapshot" | "seed";
  weeks: CalendarCell[][];  // weeks[w][d] — 53 weeks × 7 days, d=0 is Sunday
}

function levelFor(count: number): CalendarCell["level"] {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  return 4;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function buildGrid(today: Date, lookup: Record<string, number>): CalendarCell[][] {
  // End the grid on today, walk back 53 weeks × 7 days = 371 days.
  // weeks[0] is the oldest; weeks[52] contains today.
  const cells: CalendarCell[] = [];
  const totalDays = 53 * 7;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = isoDate(d);
    const count = lookup[date] ?? 0;
    cells.push({ date, count, level: levelFor(count) });
  }
  // Slice into weeks of 7 (cells[0..6], cells[7..13], ...)
  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

function deterministicSeed(today: Date): Record<string, number> {
  // Predictable pseudo-random pattern so the page renders on first build.
  // Same input always produces the same output — never depends on Date.now().
  const lookup: Record<string, number> = {};
  const totalDays = 53 * 7;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    // Mulberry-ish: deterministic int from i.
    const x = (i * 1103515245 + 12345) & 0x7fffffff;
    const r = (x % 100) / 100;
    let count = 0;
    if (r > 0.55) count = Math.floor(r * 8);          // weekdays mostly 0..7
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      count = r > 0.8 ? Math.floor(r * 4) : 0;        // weekends sparse
    }
    if (count > 0) lookup[isoDate(d)] = count;
  }
  return lookup;
}

async function fetchGitLab(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(GITLAB_URL, {
      headers: { "User-Agent": "reverse-resume-build/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[fetch-gitlab-calendar] HTTP ${res.status}; falling back.`);
      return null;
    }
    const data = await res.json();
    if (typeof data !== "object" || data === null) {
      console.warn(`[fetch-gitlab-calendar] unexpected payload shape; falling back.`);
      return null;
    }
    // GitLab returns either {date: count} or sometimes a Record-like with strings.
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(data)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch (e) {
    console.warn(`[fetch-gitlab-calendar] fetch failed: ${(e as Error).message}; falling back.`);
    return null;
  }
}

function loadSnapshotIfPresent(): CalendarSnapshot | null {
  if (!existsSync(OUT_PATH)) return null;
  try {
    const raw = readFileSync(OUT_PATH, "utf-8");
    return JSON.parse(raw) as CalendarSnapshot;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const today = new Date();
  mkdirSync(dirname(OUT_PATH), { recursive: true });

  const remote = await fetchGitLab();
  if (remote) {
    const snapshot: CalendarSnapshot = {
      fetchedAt: today.toISOString(),
      source: "gitlab",
      weeks: buildGrid(today, remote),
    };
    writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
    console.log(`[fetch-gitlab-calendar] wrote fresh snapshot (${Object.keys(remote).length} dated entries).`);
    return;
  }

  const existing = loadSnapshotIfPresent();
  if (existing) {
    console.log(`[fetch-gitlab-calendar] using committed snapshot from ${existing.fetchedAt}.`);
    return;
  }

  const seed = deterministicSeed(today);
  const snapshot: CalendarSnapshot = {
    fetchedAt: today.toISOString(),
    source: "seed",
    weeks: buildGrid(today, seed),
  };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`[fetch-gitlab-calendar] no snapshot existed; wrote deterministic seed.`);
}

main().catch((e) => {
  // Never throw — prebuild has `|| echo` as a second safety net, but
  // we belt-and-suspenders this so a partial failure mid-script doesn't
  // produce a corrupt snapshot AND a non-zero exit.
  console.error(`[fetch-gitlab-calendar] unhandled: ${(e as Error).message}`);
  process.exit(0);
});
```

- [ ] **Step 2: Smoke-run the script directly**

```bash
pnpm tsx scripts/fetch-gitlab-calendar.ts
```
Expected: prints one of:
- `[fetch-gitlab-calendar] wrote fresh snapshot (N dated entries).`
- `[fetch-gitlab-calendar] no snapshot existed; wrote deterministic seed.`
- `[fetch-gitlab-calendar] using committed snapshot from ...` (only if Step 3 already ran)

Verify the file exists:
```bash
ls -la content/generated/gitlab-calendar.json
```
Expected: file is present and ~10–80 KB.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit the script and the first snapshot**

```bash
git add scripts/fetch-gitlab-calendar.ts content/generated/gitlab-calendar.json
git commit -m "feat(build): GitLab calendar fetcher with snapshot fallback

scripts/fetch-gitlab-calendar.ts runs at prebuild time, fetches
https://gitlab.com/users/harshit_sindhu/calendar.json, buckets into 53
weeks × 7 days ending today, and writes content/generated/gitlab-calendar.json.

Always exits 0 — on network failure, falls back to a committed snapshot;
on first-ever run with no snapshot, falls back to a deterministic seed
so the page still builds. Levels are fixed thresholds (0 / 1-3 / 4-7 /
8-15 / 16+); 10s timeout on the fetch."
```

---

## Task 6: Wire the prebuild hook in `package.json`

**Files:**
- Modify: `package.json`

Add `"prebuild": "tsx scripts/fetch-gitlab-calendar.ts || echo 'using cached calendar'"`. The `|| echo` is critical — if the script ever does exit non-zero (e.g. permissions issue, disk full mid-write), CI still passes.

- [ ] **Step 1: Update `package.json`**

Find:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
```
Replace with:
```json
  "scripts": {
    "dev": "next dev",
    "prebuild": "tsx scripts/fetch-gitlab-calendar.ts || echo 'using cached calendar'",
    "build": "next build",
```

- [ ] **Step 2: Verify prebuild runs ahead of build**

Run: `pnpm build`
Expected: log shows `[fetch-gitlab-calendar]` line BEFORE the Next.js `▲ Next.js …` banner. The build itself should still succeed.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build(prebuild): refresh GitLab calendar snapshot before next build

The || echo fallback ensures a transient network failure during CI never
blocks the deploy — the committed snapshot is the safety net."
```

---

## Task 7: Create `components/projects/commit-graph.tsx` (server component)

**Files:**
- Create: `components/projects/commit-graph.tsx`

A pure server component — imports the JSON via `resolveJsonModule` at module load, zero client JS. Renders a 53×7 grid with native `title=` tooltips and `data-l="0..4"` so the per-level color comes from inline styles (`color-mix` with the accent var) without needing JS.

- [ ] **Step 1: Create the file**

```tsx
// components/projects/commit-graph.tsx
//
// Server component. Imports the committed JSON snapshot at module load
// so zero client JS ships. The 53×7 grid uses CSS variables and a
// data-l="0..4" attribute so per-level colors come from a stylesheet
// rule, not inline styles.
import calendarJson from "@/content/generated/gitlab-calendar.json";

interface CalendarCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface CalendarSnapshot {
  fetchedAt: string;
  source: "gitlab" | "snapshot" | "seed";
  weeks: CalendarCell[][];
}

const calendar = calendarJson as CalendarSnapshot;

function formatCount(count: number): string {
  if (count === 0) return "No commits";
  if (count === 1) return "1 commit";
  return `${count} commits`;
}

export function CommitGraph() {
  // Sum the past 53 weeks of activity for the meta line.
  const total = calendar.weeks.reduce(
    (sum, week) => sum + week.reduce((s, cell) => s + cell.count, 0),
    0
  );
  const fetchedAt = new Date(calendar.fetchedAt).toISOString().slice(0, 10);

  return (
    <div data-commit-graph data-source={calendar.source} className="rounded-[12px] border border-border bg-bg-elev p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
          GitLab activity · last 53 weeks
        </div>
        <div className="font-mono text-[11px] text-muted-2">
          {total} commits · snapshot {fetchedAt}
        </div>
      </div>
      <div
        role="img"
        aria-label={`GitLab commit graph: ${total} commits over the last 53 weeks. Snapshot from ${fetchedAt}.`}
        className="grid auto-cols-min grid-flow-col gap-[3px]"
      >
        {calendar.weeks.map((week, w) => (
          <div key={w} className="grid grid-rows-7 gap-[3px]">
            {week.map((cell, d) => (
              <div
                key={`${w}-${d}`}
                title={`${cell.date} — ${formatCount(cell.count)}`}
                data-l={cell.level}
                className="h-[11px] w-[11px] rounded-[2px] bg-[var(--commit-l0)] data-[l='1']:bg-[var(--commit-l1)] data-[l='2']:bg-[var(--commit-l2)] data-[l='3']:bg-[var(--commit-l3)] data-[l='4']:bg-[var(--commit-l4)]"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10.5px] text-muted-2">
        <span>less</span>
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[var(--commit-l0)]" />
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[var(--commit-l1)]" />
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[var(--commit-l2)]" />
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[var(--commit-l3)]" />
        <span className="h-[10px] w-[10px] rounded-[2px] bg-[var(--commit-l4)]" />
        <span>more</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the `--commit-lN` palette to `app/globals.css`**

Add inside the `:root` block (or the `[data-theme="light"]` block — whichever holds the light tokens):
```css
  --commit-l0: var(--bg-sunk);
  --commit-l1: color-mix(in oklab, var(--accent) 22%, var(--bg-sunk));
  --commit-l2: color-mix(in oklab, var(--accent) 45%, var(--bg-sunk));
  --commit-l3: color-mix(in oklab, var(--accent) 70%, var(--bg-sunk));
  --commit-l4: var(--accent);
```

Add inside the `[data-theme="dark"]` block:
```css
  --commit-l0: var(--bg-sunk);
  --commit-l1: color-mix(in oklab, var(--accent) 26%, var(--bg-sunk));
  --commit-l2: color-mix(in oklab, var(--accent) 50%, var(--bg-sunk));
  --commit-l3: color-mix(in oklab, var(--accent) 75%, var(--bg-sunk));
  --commit-l4: var(--accent);
```

The exact placement of these rules is whatever the existing globals.css convention dictates — drop them adjacent to the other CSS variables.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — the JSON-import import will resolve because `tsconfig.json` already has `"resolveJsonModule": true`.

- [ ] **Step 4: Commit**

```bash
git add components/projects/commit-graph.tsx app/globals.css
git commit -m "feat(projects): CommitGraph server component — 53x7 GitLab grid

Pure RSC — imports content/generated/gitlab-calendar.json at module load
so zero client JS ships for the graph. 5-level palette via CSS color-mix
with the accent var (so love-mode automatically tints the graph pink).
Native title= tooltips per cell; aria-label on the grid container for
screen readers."
```

---

## Task 8: Create the Projects components

**Files:**
- Create: `components/projects/project-card.tsx`
- Create: `components/projects/projects-grid.tsx`
- Create: `components/projects/projects-section.tsx`

Three server components. `ProjectCard` is the visual unit — reuses the same `rounded-[12px] border border-border bg-bg-elev p-4` shape as `SourceCard` and the impact-grid items so the page reads coherent. `ProjectsGrid` arranges them. `ProjectsSection` is the orchestrator that calls `loadProjects()` and pairs the grid with the `<CommitGraph/>`.

- [ ] **Step 1: Create `components/projects/project-card.tsx`**

```tsx
import type { ProjectFrontmatterT } from "@/lib/content/projects";

interface ProjectCardProps {
  project: ProjectFrontmatterT;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article
      data-project-card
      data-slug={project.slug}
      className="flex flex-col gap-3 rounded-[12px] border border-border bg-bg-elev p-5 transition-colors hover:border-border-strong"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
            {project.kind}
          </span>
          {project.status === "archived" && (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
              archived
            </span>
          )}
        </div>
        <span className="font-mono text-[10.5px] text-muted-2">{project.year}</span>
      </header>

      <h3 className="font-serif text-[20px] italic leading-tight tracking-[-0.01em] text-fg">
        {project.title}
      </h3>

      <p className="text-[13.5px] leading-relaxed text-fg-soft">{project.description}</p>

      {project.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-pill border border-border bg-bg-sunk px-2 py-0.5 font-mono text-[10.5px] text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {project.stats.length > 0 && (
        <dl className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {project.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
                {stat.label}
              </dt>
              <dd className="font-serif text-[17px] italic text-fg">{stat.val}</dd>
            </div>
          ))}
        </dl>
      )}

      {project.url && (
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 self-start text-[12.5px] text-accent transition-opacity hover:opacity-80"
        >
          View source →
        </a>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Create `components/projects/projects-grid.tsx`**

```tsx
import type { ProjectFrontmatterT } from "@/lib/content/projects";
import { ProjectCard } from "./project-card";

interface ProjectsGridProps {
  projects: ProjectFrontmatterT[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted">No projects yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {projects.map((p) => (
        <ProjectCard key={p.slug} project={p} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/projects/projects-section.tsx`**

```tsx
import { loadProjects } from "@/lib/content/projects";
import { CommitGraph } from "./commit-graph";
import { ProjectsGrid } from "./projects-grid";

export function ProjectsSection() {
  const projects = loadProjects();
  return (
    <section
      id="work"
      data-section="projects"
      className="scroll-mt-20 space-y-6 pt-12"
    >
      <header className="space-y-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
          Work
        </div>
        <h2 className="font-serif text-[32px] italic leading-tight tracking-[-0.01em] text-fg">
          Projects & production
        </h2>
        <p className="max-w-[60ch] text-[14px] text-fg-soft">
          A small selection. Each card links to source where public; ask the chat above
          for the deep version of any one of them.
        </p>
      </header>

      <CommitGraph />
      <ProjectsGrid projects={projects} />
    </section>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-card.tsx components/projects/projects-grid.tsx components/projects/projects-section.tsx
git commit -m "feat(projects): Projects section — card / grid / section orchestrator

ProjectCard reuses the rounded-[12px] border border-border bg-bg-elev p-4
shape established by SourceCard and the impact-grid items so the page
reads coherent. ProjectsGrid is a 1→2 col responsive grid. ProjectsSection
calls loadProjects() and pairs the grid with the CommitGraph. All three
are server components — no client JS."
```

---

## Task 9: Create the Now strip components

**Files:**
- Create: `components/now/now-card.tsx`
- Create: `components/now/now-strip.tsx`

Two server components. `NowCard` is one of the four cards; the icon is picked by `kind`. `NowStrip` calls `loadNow()` and renders the row.

- [ ] **Step 1: Create `components/now/now-card.tsx`**

```tsx
import type { NowFrontmatterT } from "@/lib/content/now";

type NowItem = NowFrontmatterT["items"][number];

// Icon glyphs are tiny inline SVGs so we don't ship lucide-react for four icons.
function Icon({ kind }: { kind: NowItem["kind"] }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "Building":
      // spark
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      );
    case "Reading":
      // file
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "Learning":
      // code
      return (
        <svg {...common}>
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "Listening":
      // terminal / waveform
      return (
        <svg {...common}>
          <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2" />
        </svg>
      );
  }
}

interface NowCardProps {
  item: NowItem;
}

export function NowCard({ item }: NowCardProps) {
  return (
    <article
      data-now-card
      data-kind={item.kind}
      className="flex h-full flex-col gap-2 rounded-[12px] border border-border bg-bg-elev p-4"
    >
      <header className="flex items-center gap-1.5 text-muted">
        <Icon kind={item.kind} />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.10em]">{item.kind}</span>
      </header>
      <h3 className="font-serif text-[16px] italic leading-tight text-fg">{item.title}</h3>
      <p className="text-[13px] leading-snug text-fg-soft">{item.desc}</p>
    </article>
  );
}
```

- [ ] **Step 2: Create `components/now/now-strip.tsx`**

```tsx
import { loadNow } from "@/lib/content/now";
import { NowCard } from "./now-card";

export function NowStrip() {
  const now = loadNow();
  return (
    <section
      id="now"
      data-section="now"
      className="scroll-mt-20 space-y-5 pt-12"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
            Now
          </div>
          <h2 className="font-serif text-[28px] italic leading-tight tracking-[-0.01em] text-fg">
            What I'm into this season
          </h2>
        </div>
        <span className="font-mono text-[10.5px] text-muted-2">
          updated {now.updated}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {now.items.map((item) => (
          <NowCard key={`${item.kind}:${item.title}`} item={item} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/now/now-card.tsx components/now/now-strip.tsx
git commit -m "feat(now): Now strip — 4 cards keyed by Building/Reading/Learning/Listening

NowCard renders one of four inline-SVG icons by kind so we don't pull
lucide-react for four glyphs. NowStrip is the orchestrator, calling
loadNow() and a 1→2→4 responsive grid. Both are server components."
```

---

## Task 10: Extract `components/footer.tsx` from `app/page.tsx`

**Files:**
- Create: `components/footer.tsx`

Move the existing inline `<footer>` from `app/page.tsx` into its own server component. No visual changes — the spec's "press ⌘K for the good stuff" mono line is already there. Phase 5a wires the actual Cmd-K palette; for Phase 4 the line is just text.

- [ ] **Step 1: Create `components/footer.tsx`**

```tsx
export function Footer() {
  return (
    <footer className="mt-20 grid gap-6 border-t border-border pt-[52px] pb-11 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="font-mono text-[11.5px] tracking-[0.02em] text-muted">
        © {new Date().getFullYear()} Harshit Sindhu · Built in TypeScript, deployed on a Tuesday ·{" "}
        <span className="text-accent">press ⌘K</span> for the good stuff
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="mailto:harshitsindhu10@gmail.com"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          Email
        </a>
        <a
          href="https://www.linkedin.com/in/harshit-sindhu/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
          </svg>
          LinkedIn
        </a>
        <a
          href="https://github.com/HArshit123455"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 0 0-.9-2.1c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.8 0 0-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.1 1.6 4 2 4 2c-.8 2-.3 3.5-.1 3.8A5.1 5.1 0 0 0 2.5 9.3c0 5 3.1 6.3 6 6.6-.4.4-.7.9-.8 1.5L8 22" />
          </svg>
          GitHub
        </a>
        <a
          href="https://gitlab.com/harshit_sindhu"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22.65 14.39 12 22.13 1.35 14.39a.84.84 0 0 1-.31-.94l1.22-3.78 2.43-7.5A.42.42 0 0 1 4.96 2a.43.43 0 0 1 .41.34L7.8 10.07h8.4l2.43-7.5A.42.42 0 0 1 19.04 2a.43.43 0 0 1 .41.34l2.43 7.5L23.1 13.62a.84.84 0 0 1-.31.94z" />
          </svg>
          GitLab
        </a>
        <a
          href="https://leetcode.com/u/Harry_S/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          LeetCode
        </a>
      </div>
    </footer>
  );
}
```

> Adds GitLab to the link row (spec mock has it in the header; we mirror it here so the footer has the canonical contact list). Email, LinkedIn, GitHub, LeetCode are preserved exactly as before — no regressions.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/footer.tsx
git commit -m "feat(footer): extract Footer into its own server component

Lifts the inline footer out of app/page.tsx unchanged (mono copy, link
row, kbd hint) and adds a GitLab link to the row so the canonical contact
set lives in one place. Pure RSC."
```

---

## Task 11: Wire Phase 4 sections into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

Insert `<ProjectsSection/>` and `<NowStrip/>` between `<ChatShell/>` and the new `<Footer/>`. Remove the inline footer block (it's now in `components/footer.tsx`).

- [ ] **Step 1: Update `app/page.tsx`**

Replace the entire file content with:

```tsx
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell, type SuggestionChipsByAudience } from "@/components/chat-shell";
import { ProjectsSection } from "@/components/projects/projects-section";
import { NowStrip } from "@/components/now/now-strip";
import { Footer } from "@/components/footer";

interface LandingFront {
  headline: string;
  subheadline: string;
  suggestionChips: SuggestionChipsByAudience;
}

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-10">
      <ChatShell subheadline={landing.subheadline} suggestionChips={landing.suggestionChips} />
      <ProjectsSection />
      <NowStrip />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Run a production build**

Run: `pnpm build`
Expected: PASS — prebuild line prints first, then Next.js builds without error. Note the new First Load JS for `/`; it should stay close to the Phase 3 baseline (~50–55 kB) since Projects, Now, CommitGraph, and Footer are all server components.

- [ ] **Step 4: Smoke the dev server**

Run: `pnpm dev` — confirm:
1. Hero + chat still works (TL;DR streams, tabs work).
2. Below the chat, the **Work** section renders with the GitLab commit graph and 4 project cards.
3. Below that, the **Now** strip renders with 4 cards.
4. Below that, the footer renders with the mono copy + link row (5 links including GitLab).
5. Light + dark theme — toggle confirms commit-graph and project cards re-tint correctly.
6. Mobile viewport — Now grid collapses to 1 column, Projects to 1 column, CommitGraph stays horizontally scrollable (the grid-flow-col is wider than 600px; overflow on the section is fine since the rest of the page is text).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(page): compose Phase 4 sections — ChatShell / Projects / Now / Footer

app/page.tsx becomes a four-section composition. ChatShell stays the hero
+ chat surface; ProjectsSection adds the GitLab activity graph + 4 cards;
NowStrip adds the 4-card 'what I'm into' row; Footer is the extracted
mono-copy block. All four reuse the established rounded-[12px] border
bg-bg-elev card pattern so the page reads coherent end to end."
```

---

## Task 12: Final verification

- [ ] **Step 1: Non-DB vitest suite**

```bash
pnpm vitest run components lib/rag/citation-parser.test.ts lib/rag/cache.test.ts lib/clients lib/content
```
Expected: PASS — the new `lib/content/projects.test.ts` and `lib/content/now.test.ts` join the existing green suite. Pre-existing React `setState` warning (logged in Phase 3) is not a regression.

- [ ] **Step 2: Typecheck + production build**

```bash
pnpm typecheck && pnpm build
```
Expected: PASS. The prebuild step should log either a fresh GitLab fetch or "using committed snapshot." `/` First Load JS should stay close to the Phase 3 baseline (Phase 3 was 50.8 kB; Phase 4 adds zero client components, so we expect ≤52 kB).

- [ ] **Step 3: Manual visual smoke (already done in Task 11 Step 4 — re-run if changes since)**

Verify the four sections render top-to-bottom: Hero → Projects → Now → Footer. Confirm Cmd-K hint text in footer is still just text (Phase 5a wires the actual palette).

- [ ] **Step 4: Push (hold for user — they prefer to test locally first)**

Phase 4 is ready for `git push`. Hold until the user gives the word.

---

## Done definition

- All 11 implementation tasks committed atomically (Task 12 is verification only).
- `pnpm typecheck` clean.
- `pnpm vitest run components lib/rag/citation-parser.test.ts lib/rag/cache.test.ts lib/clients lib/content` green.
- `pnpm build` clean — prebuild step runs successfully (fresh fetch OR committed snapshot OR seed).
- Manual smoke: chat works, Projects section renders the grid + CommitGraph, Now strip renders, Footer renders with 5 links.
- Phase 4 contract honored: zero new dependencies, zero client JS added for Projects/Now/CommitGraph/Footer, GitLab fetcher always exits 0, MDX frontmatter is the source of truth for cards.
