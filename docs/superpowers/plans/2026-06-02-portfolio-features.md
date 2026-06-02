# Portfolio Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three independent features to the reverse-resume portfolio — a live-refreshing GitLab activity graph (ISR), an ambient Three.js knowledge-graph in the chat's empty right column, and a dedicated `/about` page.

**Architecture:** Three self-contained parts, each independently shippable. Part A converts the build-time GitLab snapshot into a runtime ISR fetch with a fallback chain. Part B adds an `/about` route sourced from MDX (new `about.mdx` + a zod loader over existing `content/experience/*.mdx`). Part C adds a lazy, desktop-only, code-split Three.js scene that fills the `SourcesRail` empty state and yields to citations.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript, zod, gray-matter, three.js, vitest, Playwright, pnpm.

**Build order is flexible** — parts share no state. Recommended: Part A → Part B → Part C. Each part ends with typecheck + build + commit.

---

## Conventions used throughout

- Package manager is **pnpm**. Test: `pnpm test` (vitest run). Typecheck: `pnpm typecheck`. Build: `pnpm build`. E2E: `pnpm test:e2e`.
- Loader test style mirrors `lib/content/projects.test.ts`: temp dir + `_loadXFrom(dir)`.
- Card style: `rounded-[12px] border border-border bg-bg-elev`. Mono label: `font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2`. Accent token: `text-accent` / CSS var `--accent`.

---

# PART A — GitLab live refresh (ISR)

## Task A1: Extract the shared calendar transform

Pull the grid math out of the build script so the script and the runtime fetch share one implementation.

**Files:**
- Create: `lib/gitlab-calendar.ts`
- Create: `lib/gitlab-calendar.test.ts`
- Modify: `scripts/fetch-gitlab-calendar.ts`

- [ ] **Step 1: Write the failing test**

`lib/gitlab-calendar.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildGrid, lookupFromRaw, totalCommits, deterministicSeed } from "./gitlab-calendar";

const TODAY = new Date(Date.UTC(2026, 5, 2)); // 2026-06-02

describe("lib/gitlab-calendar", () => {
  it("buildGrid yields 53 weeks of 7 days", () => {
    const weeks = buildGrid(TODAY, {});
    expect(weeks).toHaveLength(53);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("buildGrid maps counts and levels from the lookup", () => {
    const weeks = buildGrid(TODAY, { "2026-06-02": 10 });
    const last = weeks[52][6];
    expect(last.date).toBe("2026-06-02");
    expect(last.count).toBe(10);
    expect(last.level).toBe(3); // 8..15 => level 3
  });

  it("lookupFromRaw coerces numeric strings and rejects non-objects", () => {
    expect(lookupFromRaw({ "2026-06-01": "4", "2026-06-02": 2 })).toEqual({
      "2026-06-01": 4,
      "2026-06-02": 2,
    });
    expect(lookupFromRaw(null)).toBeNull();
    expect(lookupFromRaw("nope")).toBeNull();
  });

  it("totalCommits sums every cell", () => {
    const weeks = buildGrid(TODAY, { "2026-06-02": 10, "2026-06-01": 5 });
    expect(totalCommits(weeks)).toBe(15);
  });

  it("deterministicSeed is stable for a given date", () => {
    expect(deterministicSeed(TODAY)).toEqual(deterministicSeed(TODAY));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/gitlab-calendar.test.ts`
Expected: FAIL — cannot find module `./gitlab-calendar`.

- [ ] **Step 3: Create `lib/gitlab-calendar.ts`**

Move the pure helpers + types out of the script (verbatim logic), add `lookupFromRaw` and `totalCommits`:
```ts
export interface CalendarCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarSnapshot {
  fetchedAt: string;
  source: "gitlab" | "snapshot" | "seed";
  weeks: CalendarCell[][];
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

export function buildGrid(today: Date, lookup: Record<string, number>): CalendarCell[][] {
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
  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

export function deterministicSeed(today: Date): Record<string, number> {
  const lookup: Record<string, number> = {};
  const totalDays = 53 * 7;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const x = (i * 1103515245 + 12345) & 0x7fffffff;
    const r = (x % 100) / 100;
    let count = 0;
    if (r > 0.55) count = Math.floor(r * 8);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      count = r > 0.8 ? Math.floor(r * 4) : 0;
    }
    if (count > 0) lookup[isoDate(d)] = count;
  }
  return lookup;
}

export function lookupFromRaw(data: unknown): Record<string, number> | null {
  if (typeof data !== "object" || data === null) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function totalCommits(weeks: CalendarCell[][]): number {
  return weeks.reduce((sum, week) => sum + week.reduce((s, c) => s + c.count, 0), 0);
}
```

- [ ] **Step 4: Refactor `scripts/fetch-gitlab-calendar.ts` to import the shared module**

Replace the now-duplicated `CalendarCell`/`CalendarSnapshot`/`levelFor`/`pad`/`isoDate`/`buildGrid`/`deterministicSeed` definitions and the normalize-loop inside `fetchGitLab` with imports. The file keeps only I/O (`fetchGitLab`, `loadSnapshotIfPresent`, `main`). Top of file:
```ts
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildGrid, deterministicSeed, lookupFromRaw, type CalendarSnapshot } from "../lib/gitlab-calendar";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const OUT_PATH = join(process.cwd(), "content/generated/gitlab-calendar.json");
```
Inside `fetchGitLab`, replace the manual normalize loop with:
```ts
    const data = await res.json();
    return lookupFromRaw(data);
```
Delete the local `levelFor`, `pad`, `isoDate`, `buildGrid`, `deterministicSeed`, and the two interfaces (now imported). Leave `fetchGitLab`, `loadSnapshotIfPresent`, `main`, and the `main().catch(...)` tail unchanged otherwise.

- [ ] **Step 5: Run the test + the build script to verify both work**

Run: `pnpm test lib/gitlab-calendar.test.ts`
Expected: PASS (5 tests).
Run: `pnpm exec tsx scripts/fetch-gitlab-calendar.ts`
Expected: prints either "wrote fresh snapshot" or "using committed snapshot" and exits 0; `content/generated/gitlab-calendar.json` still valid.

- [ ] **Step 6: Commit**

```bash
git add lib/gitlab-calendar.ts lib/gitlab-calendar.test.ts scripts/fetch-gitlab-calendar.ts
git commit -m "refactor(gitlab): extract shared calendar transform into lib/gitlab-calendar"
```

## Task A2: Runtime ISR fetch with fallback chain

**Files:**
- Create: `lib/gitlab.ts`
- Create: `lib/gitlab.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/gitlab.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getGitlabCalendar } from "./gitlab";

describe("lib/gitlab getGitlabCalendar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a gitlab-sourced 53-week grid when the fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ "2026-06-02": 7 }),
      }),
    );
    const cal = await getGitlabCalendar();
    expect(cal.source).toBe("gitlab");
    expect(cal.weeks).toHaveLength(53);
  });

  it("falls back to the committed snapshot on a non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    const cal = await getGitlabCalendar();
    expect(cal.source).not.toBe("gitlab");
    expect(cal.weeks).toHaveLength(53);
  });

  it("falls back to the committed snapshot when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const cal = await getGitlabCalendar();
    expect(cal.source).not.toBe("gitlab");
    expect(cal.weeks).toHaveLength(53);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/gitlab.test.ts`
Expected: FAIL — cannot find module `./gitlab`.

- [ ] **Step 3: Implement `lib/gitlab.ts`**

```ts
import snapshotJson from "@/content/generated/gitlab-calendar.json";
import { buildGrid, lookupFromRaw, deterministicSeed, type CalendarSnapshot } from "./gitlab-calendar";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const REVALIDATE_SECONDS = 21600; // 6 hours

const committedSnapshot = snapshotJson as CalendarSnapshot;

export async function getGitlabCalendar(): Promise<CalendarSnapshot> {
  const today = new Date();
  try {
    const res = await fetch(GITLAB_URL, {
      headers: { "User-Agent": "reverse-resume/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (res.ok) {
      const lookup = lookupFromRaw(await res.json());
      if (lookup) {
        return { fetchedAt: today.toISOString(), source: "gitlab", weeks: buildGrid(today, lookup) };
      }
    }
  } catch {
    // fall through to committed snapshot
  }

  if (committedSnapshot && Array.isArray(committedSnapshot.weeks) && committedSnapshot.weeks.length > 0) {
    return committedSnapshot;
  }

  return { fetchedAt: today.toISOString(), source: "seed", weeks: buildGrid(today, deterministicSeed(today)) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test lib/gitlab.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/gitlab.ts lib/gitlab.test.ts
git commit -m "feat(gitlab): ISR runtime fetch with snapshot fallback chain"
```

## Task A3: Make CommitGraph an async server component

**Files:**
- Modify: `components/projects/commit-graph.tsx`

- [ ] **Step 1: Rewrite `commit-graph.tsx` to fetch at request time**

Replace the static JSON import and sync function. `ProjectsSection` (server component, `components/projects/projects-section.tsx:26`) renders `<CommitGraph />` and supports an async child in RSC.
```tsx
import { getGitlabCalendar } from "@/lib/gitlab";
import { totalCommits } from "@/lib/gitlab-calendar";

function formatCount(count: number): string {
  if (count === 0) return "No commits";
  if (count === 1) return "1 commit";
  return `${count} commits`;
}

export async function CommitGraph() {
  const calendar = await getGitlabCalendar();
  const total = totalCommits(calendar.weeks);
  const fetchedAt = new Date(calendar.fetchedAt).toISOString().slice(0, 10);
  const freshness = calendar.source === "gitlab" ? "live" : `snapshot ${fetchedAt}`;

  return (
    <div
      data-commit-graph
      data-source={calendar.source}
      className="rounded-[12px] border border-border bg-bg-elev p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
          GitLab activity · last 53 weeks
        </div>
        <div className="font-mono text-[11px] text-muted-2">
          {total} commits · {freshness}
        </div>
      </div>
      <div
        role="img"
        aria-label={`GitLab commit graph: ${total} commits over the last 53 weeks (${freshness}).`}
        className="grid auto-cols-min grid-flow-col gap-[3px] overflow-x-auto"
      >
        {calendar.weeks.map((week, w) => (
          <div key={w} className="grid grid-rows-7 gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} — ${formatCount(cell.count)}`}
                data-l={cell.level}
                className="h-[11px] w-[11px] rounded-[2px]"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10.5px] text-muted-2">
        <span>less</span>
        <span data-l={0} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={1} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={2} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={3} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={4} className="h-[10px] w-[10px] rounded-[2px]" />
        <span>more</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Build to confirm the async server component renders**

Run: `pnpm build`
Expected: build succeeds; the home route still compiles.

- [ ] **Step 4: Commit**

```bash
git add components/projects/commit-graph.tsx
git commit -m "feat(gitlab): CommitGraph reads live calendar via ISR (zero client JS)"
```

---

# PART B — `/about` page

## Task B1: Experience timeline loader

**Files:**
- Create: `lib/content/experience.ts`
- Create: `lib/content/experience.test.ts`
- Modify: `content/experience/engineers-india.mdx`

- [ ] **Step 1: Write the failing test**

`lib/content/experience.test.ts` (mirrors `projects.test.ts`):
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadExperienceFrom, ExperienceFrontmatter } from "./experience";

describe("lib/content/experience", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "rr-exp-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  function write(name: string, fm: string) {
    writeFileSync(join(dir, name), `---\n${fm}\n---\nbody\n`);
  }

  it("includes employed roles, sorted by start year descending", () => {
    write("zykrr.mdx", `title: "Z"\nrole: "Software Developer"\nemployer: "Zykrr"\ndates: "2024 to present"\nlocation: "Delhi"\nstack: ["TypeScript"]`);
    write("eil.mdx", `title: "E"\nrole: "Intern"\nemployer: "Engineers India Limited"\ndates: "2022"\nlocation: "Delhi"\nstack: []`);
    write("dtu.mdx", `title: "D"\nrole: "B.Tech"\nemployer: "Delhi Technological University"\ndates: "2020-2024"\nlocation: "Delhi"\nstack: []`);
    const exp = _loadExperienceFrom(dir);
    expect(exp.map((e) => e.employer)).toEqual([
      "Zykrr",
      "Engineers India Limited",
      "Delhi Technological University",
    ]);
  });

  it("excludes Personal entries (position papers, side projects)", () => {
    write("zykrr.mdx", `title: "Z"\nrole: "Dev"\nemployer: "Zykrr"\ndates: "2024 to present"\nlocation: "Delhi"\nstack: []`);
    write("philosophy.mdx", `title: "P"\nrole: "Position paper"\nemployer: "Personal"\nstack: []`);
    write("proshop.mdx", `title: "PS"\nrole: "Personal Project"\nemployer: "Personal"\ndates: "2023"\nlocation: "Remote"\nstack: ["React"]`);
    const exp = _loadExperienceFrom(dir);
    expect(exp.map((e) => e.employer)).toEqual(["Zykrr"]);
  });

  it("excludes employed entries that are missing dates (cannot place on a timeline)", () => {
    write("nodate.mdx", `title: "N"\nrole: "Dev"\nemployer: "SomeCo"\nlocation: "Delhi"\nstack: []`);
    expect(_loadExperienceFrom(dir)).toHaveLength(0);
  });

  it("validates the zod schema directly", () => {
    const r = ExperienceFrontmatter.safeParse({
      title: "T", role: "Dev", employer: "Zykrr", dates: "2024", location: "Delhi", stack: ["TS"],
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/content/experience.test.ts`
Expected: FAIL — cannot find module `./experience`.

- [ ] **Step 3: Implement `lib/content/experience.ts`**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const ExperienceFrontmatter = z.object({
  title: z.string().min(1).max(120),
  role: z.string().min(1).max(80),
  employer: z.string().min(1).max(80),
  dates: z.string().min(1).max(40).optional(),
  location: z.string().min(1).max(80).optional(),
  stack: z.array(z.string().min(1).max(40)).max(20).default([]),
});

export type ExperienceFrontmatterT = z.infer<typeof ExperienceFrontmatter>;

function startYear(dates: string): number {
  const m = dates.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

export function _loadExperienceFrom(dir: string): ExperienceFrontmatterT[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  return files
    .map((f) => ExperienceFrontmatter.parse(matter(readFileSync(join(dir, f), "utf-8")).data))
    .filter((e) => e.employer !== "Personal" && !!e.dates)
    .sort((a, b) => startYear(b.dates as string) - startYear(a.dates as string));
}

export function loadExperience(): ExperienceFrontmatterT[] {
  return _loadExperienceFrom(join(process.cwd(), "content/experience"));
}
```

- [ ] **Step 4: Add the missing `dates` field to the real Engineers India entry**

In `content/experience/engineers-india.mdx`, the frontmatter currently has no `dates`. Add it under `employer:` so the entry appears on the timeline (résumé: May–July 2022):
```yaml
employer: "Engineers India Limited"
dates: "2022"
location: "New Delhi, India"
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test lib/content/experience.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/content/experience.ts lib/content/experience.test.ts content/experience/engineers-india.mdx
git commit -m "feat(about): zod experience-timeline loader + dates for Engineers India"
```

## Task B2: About content loader + `content/about.mdx`

**Files:**
- Create: `lib/content/about.ts`
- Create: `lib/content/about.test.ts`
- Create: `content/about.mdx`

- [ ] **Step 1: Write the failing test**

`lib/content/about.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { loadAbout, AboutFrontmatter } from "./about";

describe("lib/content/about", () => {
  it("loads about.mdx with frontmatter and a prose body", () => {
    const about = loadAbout();
    expect(about.data.name.length).toBeGreaterThan(0);
    expect(about.data.skills.length).toBeGreaterThan(0);
    expect(about.data.links.length).toBeGreaterThan(0);
    expect(about.body.trim().length).toBeGreaterThan(0);
  });

  it("validates the zod schema (photo optional)", () => {
    const r = AboutFrontmatter.safeParse({
      name: "X", tagline: "t", resumeUrl: "/resume.pdf",
      skills: [{ group: "Backend", items: ["Node.js"] }],
      achievements: ["a"],
      links: [{ label: "GitHub", href: "https://github.com/x" }],
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/content/about.test.ts`
Expected: FAIL — cannot find module `./about` (and `about.mdx` missing).

- [ ] **Step 3: Implement `lib/content/about.ts`**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const SkillGroup = z.object({
  group: z.string().min(1).max(40),
  items: z.array(z.string().min(1).max(40)).min(1).max(20),
});

export const AboutLink = z.object({
  label: z.string().min(1).max(40),
  href: z.string().min(1).max(200),
});

export const AboutFrontmatter = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  photo: z.string().min(1).max(200).optional(),
  resumeUrl: z.string().min(1).max(200).default("/resume.pdf"),
  skills: z.array(SkillGroup).min(1).max(8),
  achievements: z.array(z.string().min(1).max(200)).max(10).default([]),
  links: z.array(AboutLink).min(1).max(8),
});

export type AboutFrontmatterT = z.infer<typeof AboutFrontmatter>;

export function loadAbout(): { data: AboutFrontmatterT; body: string } {
  const raw = readFileSync(join(process.cwd(), "content/about.mdx"), "utf-8");
  const parsed = matter(raw);
  return { data: AboutFrontmatter.parse(parsed.data), body: parsed.content };
}
```

- [ ] **Step 4: Create `content/about.mdx`** (real content from the résumé)

```mdx
---
name: "Harshit Sindhu"
tagline: "Backend-heavy full-stack developer — Node.js, TypeScript, PostgreSQL, React/Next.js"
# photo: "/me.jpg"   # uncomment once a photo is added to /public
resumeUrl: "/resume.pdf"
skills:
  - group: "Languages"
    items: ["JavaScript", "TypeScript", "Python", "C++", "SQL"]
  - group: "Backend"
    items: ["Node.js", "NestJS", "Express", "REST APIs", "SSE", "BullMQ"]
  - group: "Frontend"
    items: ["React", "Next.js", "Redux", "Tailwind CSS"]
  - group: "Databases & Caching"
    items: ["PostgreSQL", "pgvector", "Redis", "MongoDB", "Drizzle ORM", "TypeORM"]
  - group: "AI / Agents"
    items: ["Anthropic SDK", "Model Context Protocol", "Voyage embeddings", "RAG"]
achievements:
  - "Solved 400+ DSA problems across LeetCode, GeeksforGeeks, and CodeStudio"
  - "5-star rated in Problem Solving on HackerRank"
  - "Completed Walmart USA Advanced Software Engineering virtual program (Forage, 2023)"
links:
  - { label: "GitHub", href: "https://github.com/HArshit123455" }
  - { label: "LinkedIn", href: "https://www.linkedin.com/in/harshit-sindhu/" }
  - { label: "LeetCode", href: "https://leetcode.com/u/Harry_S/" }
  - { label: "Email", href: "mailto:harshitsindhu10@gmail.com" }
---

I'm a backend-heavy full-stack developer with ~2 years building scalable B2B web
applications. At Zykrr I own roughly half of the backend of a customer-experience
analytics platform — database design, 100+ REST APIs, an SLA engine, a transactional
outbox across core entities, and the Redis caching layer that fronts entitlement checks —
and I wire up the React/Next.js screens that consume them.

I work TypeScript end-to-end: frontend, backend, build scripts, eval harnesses. I care
about data correctness, idempotency, and time-based behaviour — the kind of details that
separate a demo from production. Outside of work I build things like this site (a
citation-grounded RAG over my own code) and an MCP server exposing job-search tools.
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test lib/content/about.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/content/about.ts lib/content/about.test.ts content/about.mdx
git commit -m "feat(about): about.mdx content + zod loader"
```

## Task B3: About UI components

**Files:**
- Create: `components/about/bio-prose.tsx`
- Create: `components/about/work-timeline.tsx`
- Create: `components/about/skill-groups.tsx`

- [ ] **Step 1: Create `components/about/bio-prose.tsx`** (client; reuses installed react-markdown, no citation coupling)

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BioProse({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-fg-soft">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/about/work-timeline.tsx`** (server component)

```tsx
import type { ExperienceFrontmatterT } from "@/lib/content/experience";

export function WorkTimeline({ items }: { items: ExperienceFrontmatterT[] }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        Where I've worked
      </h2>
      <ol className="space-y-3 border-l border-border pl-5">
        {items.map((e) => (
          <li key={`${e.employer}-${e.dates}`} className="relative rounded-[12px] border border-border bg-bg-elev p-4">
            <span className="absolute -left-[27px] top-5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-[15px] font-semibold text-fg">{e.role}</h3>
              <span className="font-mono text-[11px] text-muted-2">{e.dates}</span>
            </div>
            <div className="mt-0.5 text-[13.5px] text-fg-soft">
              {e.employer}
              {e.location ? <span className="text-muted"> · {e.location}</span> : null}
            </div>
            {e.stack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.stack.map((s) => (
                  <span key={s} className="rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[11px] text-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 3: Create `components/about/skill-groups.tsx`** (server component)

```tsx
import type { AboutFrontmatterT } from "@/lib/content/about";

export function SkillGroups({ skills }: { skills: AboutFrontmatterT["skills"] }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        What I work with
      </h2>
      <div className="space-y-3">
        {skills.map((g) => (
          <div key={g.group} className="rounded-[12px] border border-border bg-bg-elev p-4">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{g.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((it) => (
                <span key={it} className="rounded-full bg-bg-sunk px-2.5 py-1 text-[12.5px] text-fg-soft">
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (components compile against the loader types).

- [ ] **Step 5: Commit**

```bash
git add components/about/bio-prose.tsx components/about/work-timeline.tsx components/about/skill-groups.tsx
git commit -m "feat(about): bio-prose, work-timeline, and skill-groups components"
```

## Task B4: The `/about` route

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: Create `app/about/page.tsx`** (server component; Header + container come from `app/layout.tsx`; renders its own Footer like the home page)

```tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { loadAbout } from "@/lib/content/about";
import { loadExperience } from "@/lib/content/experience";
import { BioProse } from "@/components/about/bio-prose";
import { WorkTimeline } from "@/components/about/work-timeline";
import { SkillGroups } from "@/components/about/skill-groups";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About — Harshit Sindhu",
  description: "Backend-heavy full-stack developer. Where I've worked, what I build, and how to reach me.",
};

export default function AboutPage() {
  const { data, body } = loadAbout();
  const experience = loadExperience();

  return (
    <div className="mx-auto max-w-[640px] space-y-10">
      <header className="space-y-3">
        {data.photo && (
          <Image
            src={data.photo}
            alt={data.name}
            width={88}
            height={88}
            className="rounded-full border border-border object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-fg">{data.name}</h1>
          <p className="mt-1 text-[15px] text-muted">{data.tagline}</p>
        </div>
      </header>

      <BioProse content={body} />

      <WorkTimeline items={experience} />

      <SkillGroups skills={data.skills} />

      {data.achievements.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">Achievements</h2>
          <ul className="space-y-2">
            {data.achievements.map((a) => (
              <li key={a} className="flex gap-2 text-[14px] text-fg-soft">
                <span className="text-accent" aria-hidden>▹</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[12px] border border-border bg-bg-elev p-5">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={data.resumeUrl}
            className="inline-flex items-center rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
          >
            Download résumé (PDF)
          </a>
          {data.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-[14px] text-muted hover:text-fg transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <p className="mt-3 text-[13.5px] text-muted">
          Prefer to dig in?{" "}
          <Link href="/" className="text-accent hover:underline">
            Ask my work anything →
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Build + manually verify the route**

Run: `pnpm build`
Expected: `/about` appears in the route list; build succeeds.
Run: `pnpm dev`, open `http://localhost:3000/about` — bio, timeline (Zykrr → Engineers India → DTU), skills, achievements, résumé button + links render. No photo (commented out) and layout still reads correctly.

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(about): /about route (single-column, conditional photo)"
```

## Task B5: Header link + e2e

**Files:**
- Modify: `components/header.tsx`
- Create: `e2e/about.spec.ts`

- [ ] **Step 1: Add the About link to the header**

In `components/header.tsx`, add a `next/link` to `/about` as the first item inside the right-hand `<div className="flex items-center gap-2">` (before the LinkedIn `<a>`). Add the import at the top:
```tsx
import Link from "next/link";
```
Insert:
```tsx
          <Link
            href="/about"
            className="mr-1 hidden sm:inline-flex items-center rounded-[10px] px-2.5 py-1.5 text-[13px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            About
          </Link>
```

- [ ] **Step 2: Write the e2e test**

`e2e/about.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("about page renders the key blocks", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Harshit Sindhu", level: 1 })).toBeVisible();
  await expect(page.getByText("Where I've worked")).toBeVisible();
  await expect(page.getByRole("link", { name: /Download résumé/i })).toBeVisible();
});

test("header About link navigates to /about", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
});
```

- [ ] **Step 3: Run the e2e test**

Run: `pnpm test:e2e about.spec.ts`
Expected: PASS (2 tests). (If the dev/preview server isn't auto-started by `playwright.config.ts`, start `pnpm build && pnpm start` first per the existing e2e convention.)

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm typecheck` → no errors.
```bash
git add components/header.tsx e2e/about.spec.ts
git commit -m "feat(about): header nav link + e2e coverage"
```

---

# PART C — Three.js knowledge graph

## Task C1: Add three.js dependency

**Files:**
- Modify: `package.json` / `pnpm-lock.yaml`

- [ ] **Step 1: Install three + types**

Run:
```bash
pnpm add three
pnpm add -D @types/three
```
Expected: `three` in `dependencies`, `@types/three` in `devDependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add three + @types/three for knowledge-graph"
```

## Task C2: Static graph data derived from the corpus

**Files:**
- Create: `lib/graph-data.ts`
- Create: `lib/graph-data.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/graph-data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { GRAPH } from "./graph-data";

describe("lib/graph-data", () => {
  it("has unique node ids", () => {
    const ids = GRAPH.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every edge references existing nodes", () => {
    const ids = new Set(GRAPH.nodes.map((n) => n.id));
    for (const e of GRAPH.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it("the self node connects to every repo node", () => {
    const repos = GRAPH.nodes.filter((n) => n.group === "repo").map((n) => n.id);
    const fromMe = GRAPH.edges.filter((e) => e.from === "me").map((e) => e.to);
    for (const r of repos) expect(fromMe).toContain(r);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test lib/graph-data.test.ts`
Expected: FAIL — cannot find module `./graph-data`.

- [ ] **Step 3: Implement `lib/graph-data.ts`**

```ts
export type NodeGroup = "self" | "repo" | "leaf";

export interface GraphNode {
  id: string;
  label: string;
  group: NodeGroup;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const GRAPH: GraphData = {
  nodes: [
    { id: "me", label: "me", group: "self" },
    { id: "reverse-resume", label: "reverse-resume", group: "repo" },
    { id: "job-mcp", label: "job-mcp", group: "repo" },
    { id: "sla-engine", label: "sla-engine", group: "repo" },
    { id: "outbox", label: "outbox-dispatcher", group: "repo" },
    { id: "pro-shop", label: "pro-shop", group: "repo" },
    { id: "rag", label: "RAG", group: "leaf" },
    { id: "mcp", label: "MCP", group: "leaf" },
    { id: "queues", label: "queues", group: "leaf" },
    { id: "caching", label: "caching", group: "leaf" },
    { id: "payments", label: "payments", group: "leaf" },
  ],
  edges: [
    { from: "me", to: "reverse-resume" },
    { from: "me", to: "job-mcp" },
    { from: "me", to: "sla-engine" },
    { from: "me", to: "outbox" },
    { from: "me", to: "pro-shop" },
    { from: "reverse-resume", to: "rag" },
    { from: "job-mcp", to: "mcp" },
    { from: "sla-engine", to: "queues" },
    { from: "outbox", to: "queues" },
    { from: "sla-engine", to: "caching" },
    { from: "pro-shop", to: "payments" },
  ],
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test lib/graph-data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/graph-data.ts lib/graph-data.test.ts
git commit -m "feat(graph): static knowledge-graph node/edge data from corpus"
```

## Task C3: The render-decision helper (pure, testable)

**Files:**
- Create: `components/chat/graph-decision.ts`
- Create: `components/chat/graph-decision.test.ts`

- [ ] **Step 1: Write the failing test**

`components/chat/graph-decision.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { graphDecision } from "./graph-decision";

describe("graphDecision", () => {
  it("renders nothing without WebGL", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: false, webgl: false })).toBe("none");
  });
  it("renders nothing on mobile", () => {
    expect(graphDecision({ isDesktop: false, reducedMotion: false, webgl: true })).toBe("none");
  });
  it("renders a static frame when reduced motion is requested", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: true, webgl: true })).toBe("static");
  });
  it("animates on desktop with WebGL and motion allowed", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: false, webgl: true })).toBe("animate");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test components/chat/graph-decision.test.ts`
Expected: FAIL — cannot find module `./graph-decision`.

- [ ] **Step 3: Implement `components/chat/graph-decision.ts`**

```ts
export type GraphMode = "animate" | "static" | "none";

export function graphDecision(opts: {
  isDesktop: boolean;
  reducedMotion: boolean;
  webgl: boolean;
}): GraphMode {
  if (!opts.webgl || !opts.isDesktop) return "none";
  return opts.reducedMotion ? "static" : "animate";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test components/chat/graph-decision.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/chat/graph-decision.ts components/chat/graph-decision.test.ts
git commit -m "feat(graph): pure render-decision helper (desktop/webgl/reduced-motion)"
```

## Task C4: The Three.js scene component

**Files:**
- Create: `components/chat/knowledge-graph.tsx`

This component is verified manually (WebGL rendering isn't unit-tested). It builds a deterministic layout from `GRAPH`, renders nodes as points and edges as lines, slow-rotates the group, applies cursor parallax, honours `animate=false` (single frame), and disposes everything on unmount.

- [ ] **Step 1: Create `components/chat/knowledge-graph.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GRAPH, type GraphNode } from "@/lib/graph-data";

// Deterministic 3D layout: self at origin, repos on a ring, leaves pushed outward.
function layout(): Map<string, THREE.Vector3> {
  const pos = new Map<string, THREE.Vector3>();
  const repos = GRAPH.nodes.filter((n) => n.group === "repo");
  pos.set("me", new THREE.Vector3(0, 0, 0));
  repos.forEach((r, i) => {
    const a = (i / repos.length) * Math.PI * 2;
    pos.set(r.id, new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2, (i % 2 === 0 ? 1 : -1) * 0.8));
  });
  GRAPH.nodes
    .filter((n) => n.group === "leaf")
    .forEach((leaf) => {
      const parent = GRAPH.edges.find((e) => e.to === leaf.id)?.from ?? "me";
      const base = pos.get(parent) ?? new THREE.Vector3();
      pos.set(leaf.id, base.clone().multiplyScalar(1.5).add(new THREE.Vector3(0.4, -0.5, 0.6)));
    });
  return pos;
}

function colorFor(group: GraphNode["group"], accent: THREE.Color): THREE.Color {
  if (group === "self") return accent.clone();
  if (group === "repo") return accent.clone().lerp(new THREE.Color("#ffffff"), 0.25);
  return new THREE.Color("#7a849b");
}

export function KnowledgeGraph({ animate = true }: { animate?: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 360;

    const accent = new THREE.Color(
      getComputedStyle(mount).getPropertyValue("--accent").trim() || "#6ea8fe",
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const pos = layout();

    // Edges
    const edgePoints: number[] = [];
    for (const e of GRAPH.edges) {
      const a = pos.get(e.from)!;
      const b = pos.get(e.to)!;
      edgePoints.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePoints, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.3 });
    const lines = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(lines);

    // Nodes (one Points cloud per group so we can size/colour differently)
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const meshes: THREE.Mesh[] = [];
    for (const n of GRAPH.nodes) {
      const p = pos.get(n.id)!;
      const r = n.group === "self" ? 0.32 : n.group === "repo" ? 0.18 : 0.1;
      const mat = new THREE.MeshBasicMaterial({ color: colorFor(n.group, accent) });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(r);
      mesh.position.copy(p);
      group.add(mesh);
      meshes.push(mesh);
    }

    let raf = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const onPointerMove = (ev: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      targetRotY = ((ev.clientX - rect.left) / rect.width - 0.5) * 0.6;
      targetRotX = ((ev.clientY - rect.top) / rect.height - 0.5) * 0.6;
    };
    mount.addEventListener("pointermove", onPointerMove);

    const renderFrame = () => {
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.05 + (animate ? 0.0025 : 0);
      renderer.render(scene, camera);
      if (animate) raf = requestAnimationFrame(renderFrame);
    };
    renderFrame();

    const onResize = () => {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (!animate) renderer.render(scene, camera);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointermove", onPointerMove);
      edgeGeo.dispose();
      edgeMat.dispose();
      sphereGeo.dispose();
      meshes.forEach((m) => (m.material as THREE.Material).dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [animate]);

  return (
    <div
      ref={mountRef}
      data-knowledge-graph
      aria-hidden
      className="h-[360px] w-full overflow-hidden rounded-[12px]"
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (three types resolve via `@types/three`).

- [ ] **Step 3: Commit**

```bash
git add components/chat/knowledge-graph.tsx
git commit -m "feat(graph): three.js knowledge-graph scene (rotate, parallax, dispose)"
```

## Task C5: Lazy wrapper + wire into SourcesRail

**Files:**
- Create: `components/chat/knowledge-graph-lazy.tsx`
- Modify: `components/chat/sources-rail.tsx`

- [ ] **Step 1: Create `components/chat/knowledge-graph-lazy.tsx`**

Code-splits three.js (`ssr: false`), decides mode after idle, renders the citations-empty text as the SSR/fallback markup.
```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { graphDecision, type GraphMode } from "./graph-decision";

const KnowledgeGraph = dynamic(
  () => import("./knowledge-graph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

const FALLBACK = (
  <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
);

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function KnowledgeGraphLazy() {
  const [mode, setMode] = useState<GraphMode>("none");

  useEffect(() => {
    const decide = () =>
      setMode(
        graphDecision({
          isDesktop: window.matchMedia("(min-width: 768px)").matches,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          webgl: hasWebGL(),
        }),
      );
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (ric) {
      const id = ric(decide);
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = setTimeout(decide, 200);
    return () => clearTimeout(t);
  }, []);

  if (mode === "none") return FALLBACK;
  return <KnowledgeGraph animate={mode === "animate"} />;
}
```

- [ ] **Step 2: Wire it into the desktop empty branch of `components/chat/sources-rail.tsx`**

Add the import near the other imports:
```tsx
import { KnowledgeGraphLazy } from "./knowledge-graph-lazy";
```
In the **desktop** `<aside>` branch only, swap the empty placeholder for the graph (leave the mobile `<details>` branch using the text `empty` as-is):
```tsx
        <div className="space-y-3">
          {citations.length === 0 ? <KnowledgeGraphLazy /> : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
```
The mobile branch line stays:
```tsx
          {citations.length === 0 ? empty : citations.map((c) => <SourceCard key={c.n} card={c} />)}
```

- [ ] **Step 3: Typecheck + build + verify bundle isolation**

Run: `pnpm typecheck` → no errors.
Run: `pnpm build` → succeeds. Confirm three.js is in a **separate chunk** (a dynamic chunk, not the home route's First Load JS). The home route First Load JS should remain ≈ its previous value (~50 kB) — if it jumped by ~150 kB, the dynamic import is misconfigured.

- [ ] **Step 4: Manual verification**

Run `pnpm dev`, open `http://localhost:3000` on a desktop viewport:
- Before asking anything, the right rail shows the rotating graph; moving the cursor over it tilts it.
- Ask a question → graph is replaced by citation cards.
- DevTools → emulate `prefers-reduced-motion: reduce` → graph renders a static frame (no spin).
- Narrow viewport (<768px) → no graph, no three.js chunk loaded; rail falls back to the text/accordion.

- [ ] **Step 5: Commit**

```bash
git add components/chat/knowledge-graph-lazy.tsx components/chat/sources-rail.tsx
git commit -m "feat(graph): lazy desktop-only mount, wired into SourcesRail empty state"
```

---

## Final verification (all parts)

- [ ] `pnpm test` — all unit tests pass (gitlab-calendar, gitlab, experience, about, graph-data, graph-decision + existing suites).
- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm build` — clean; routes include `/` and `/about`; three.js is a separate dynamic chunk.
- [ ] `pnpm test:e2e` — about specs pass alongside existing e2e.

---

## Self-review notes (author)

**Spec coverage:**
- GitLab ISR (revalidate 6 h, fallback chain, zero client JS, shared transform) → Tasks A1–A3. ✓
- Three.js (dynamic/ssr:false, desktop-only, idle mount, raw three, corpus data, reduced-motion + WebGL fallback, replaced by citations) → Tasks C1–C5. ✓
- `/about` (Layout A single column, conditional photo, bio/timeline/skills/achievements/links+résumé+"ask" link, experience from MDX, header link) → Tasks B1–B5. ✓
- Testing requirements from spec → covered per task.

**Type consistency:** `CalendarSnapshot`/`CalendarCell` defined once in `lib/gitlab-calendar.ts`, imported by script + `lib/gitlab.ts` + (shape) `commit-graph`. `GraphMode` defined in `graph-decision.ts`, imported by the lazy wrapper. `ExperienceFrontmatterT` / `AboutFrontmatterT` flow from loaders into components. `KnowledgeGraph` prop `animate` matches the wrapper's usage.

**No placeholders:** every code step contains complete code; every run step has an expected result.
