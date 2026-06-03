# About Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/about` into the five-section editorial profile from the design handoff (hero + stat strip, logo-led timeline, skills, achievements, CTA), data-driven from MDX, reusing the site's existing tokens/chrome.

**Architecture:** Extend the zod content schemas (`about`, `experience`) with a few display fields, add new presentational server components under `components/about/`, one small client `Reveal` wrapper for scroll-reveal, and a scoped `About` CSS block in `globals.css` for the fiddly bits. Reuse header, footer, ⌘K palette, theme toggle, and all design tokens unchanged.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind v3 (CSS-var tokens), gray-matter + zod for MDX content, Vitest + Testing Library, Playwright.

**Spec:** [docs/superpowers/specs/2026-06-03-about-page-redesign-design.md](../specs/2026-06-03-about-page-redesign-design.md)

---

## File structure

**Create:**
- `components/about/icons.tsx` — 5 inline line icons (`pin`, `briefcase`, `code`, `arrow-right`, `file`)
- `components/about/reveal.tsx` — client IntersectionObserver scroll-reveal wrapper
- `components/about/section-head.tsx` — section number + serif title + hairline rule
- `components/about/logo-tile.tsx` — client; logo `<img>` on light chip + monogram fallback
- `components/about/about-hero.tsx` — hero block
- `components/about/logo-timeline.tsx` — experience/education timeline
- `components/about/skill-stack.tsx` — skill chip cards
- `components/about/achievements.tsx` — achievements list
- `components/about/cta-card.tsx` — résumé + links CTA
- `components/about/logo-tile.test.tsx`, `components/about/reveal.test.tsx`
- `e2e/about.spec.ts`

**Modify:**
- `lib/content/experience.ts` — add `kind`, `summary`, `logo`; add `isCurrent` helper
- `lib/content/about.ts` — add `location`, `availability`, `lede`, `support`, `stats`
- `lib/content/about.test.ts`, `lib/content/experience.test.ts` (create if absent)
- `content/about.mdx` — add new frontmatter fields + final copy
- `content/experience/zykrr.mdx`, `engineers-india.mdx`, `dtu-education.mdx` — add `kind`, `summary`, `logo`
- `app/about/page.tsx` — full rewrite (compose new components)
- `app/globals.css` — append `About` CSS block
- `components/footer.tsx` — add About link
- `components/palette/commands.ts` — 3 new Navigate commands
- `components/chrome.tsx` — handlers for the 3 new commands

**Retired from `/about` render (not deleted):** `components/about/work-timeline.tsx`, `components/about/skill-groups.tsx`, `components/about/bio-prose.tsx`.

---

## Task 1: Extend experience schema + content

**Files:**
- Modify: `lib/content/experience.ts`
- Modify: `content/experience/zykrr.mdx`, `content/experience/engineers-india.mdx`, `content/experience/dtu-education.mdx`
- Test: `lib/content/experience.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `lib/content/experience.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ExperienceFrontmatter, isCurrent } from "@/lib/content/experience";

describe("ExperienceFrontmatter", () => {
  const base = { title: "T", role: "R", employer: "E", dates: "2024 to present" };

  it("accepts the new display fields", () => {
    const parsed = ExperienceFrontmatter.parse({
      ...base,
      kind: "Full-time",
      summary: "Did things.",
      logo: "/logos/zykrr.svg",
      stack: ["TypeScript"],
    });
    expect(parsed.kind).toBe("Full-time");
    expect(parsed.summary).toBe("Did things.");
    expect(parsed.logo).toBe("/logos/zykrr.svg");
  });

  it("rejects an invalid kind", () => {
    expect(() => ExperienceFrontmatter.parse({ ...base, kind: "Contractor" })).toThrow();
  });

  it("leaves the new fields optional", () => {
    expect(() => ExperienceFrontmatter.parse(base)).not.toThrow();
  });
});

describe("isCurrent", () => {
  it("is true when dates mention present (any case)", () => {
    expect(isCurrent("2024 to present")).toBe(true);
    expect(isCurrent("2024 — Present")).toBe(true);
  });
  it("is false for finished ranges", () => {
    expect(isCurrent("2020-2024")).toBe(false);
    expect(isCurrent(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/content/experience.test.ts`
Expected: FAIL — `isCurrent` is not exported / new fields rejected.

- [ ] **Step 3: Implement the schema additions**

In `lib/content/experience.ts`, extend the schema object (add the three fields after `stack`) and add the helper. Final `ExperienceFrontmatter` and new export:

```ts
export const ExperienceFrontmatter = z.object({
  title: z.string().min(1).max(120),
  role: z.string().min(1).max(80),
  employer: z.string().min(1).max(80),
  dates: z.string().min(1).max(40).optional(),
  location: z.string().min(1).max(80).optional(),
  stack: z.array(z.string().min(1).max(40)).max(20).default([]),
  order: z.number().int().optional(),
  kind: z.enum(["Full-time", "Internship", "Education"]).optional(),
  summary: z.string().min(1).max(400).optional(),
  logo: z.string().min(1).max(200).optional(),
});

export function isCurrent(dates?: string): boolean {
  return !!dates && /present/i.test(dates);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/content/experience.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the new frontmatter to the three content files**

In `content/experience/zykrr.mdx` frontmatter, add (after `stack:`):

```yaml
kind: "Full-time"
logo: "/logos/zykrr.svg"
summary: "Designed and shipped core backend — schema design, 100+ REST APIs, an SLA engine with multi-level escalation, a transactional outbox across entities, and Redis-backed entitlement checks — plus the React/Next.js screens that consume them."
```

In `content/experience/engineers-india.mdx` frontmatter, add:

```yaml
kind: "Internship"
logo: "/logos/engineers-india.svg"
summary: "An engineering internship at a public-sector consultancy — first real exposure to large-scale systems and disciplined documentation."
```

In `content/experience/dtu-education.mdx` frontmatter, add:

```yaml
kind: "Education"
logo: "/logos/dtu.svg"
summary: "Computer Engineering — data structures, systems, and databases alongside competitive programming."
```

- [ ] **Step 6: Commit**

```bash
git add lib/content/experience.ts lib/content/experience.test.ts content/experience/zykrr.mdx content/experience/engineers-india.mdx content/experience/dtu-education.mdx
git commit -m "feat(about): extend experience schema with kind/summary/logo + isCurrent"
```

---

## Task 2: Extend about schema + content

**Files:**
- Modify: `lib/content/about.ts`
- Modify: `content/about.mdx`
- Test: `lib/content/about.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `lib/content/about.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { AboutFrontmatter } from "@/lib/content/about";

const valid = {
  name: "Harshit Sindhu",
  tagline: "Backend-heavy full-stack developer",
  location: "New Delhi, India",
  availability: "Open to opportunities",
  lede: "I own the *backend half* of B2B platforms.",
  support: "At Zykrr I work across an analytics platform.",
  stats: [
    { num: "~2", unit: "yrs", cap: "building B2B platforms in production" },
    { num: "100+", cap: "REST APIs designed & shipped" },
    { num: "400+", cap: "DSA problems solved" },
    { num: "5", unit: "★", cap: "Problem Solving on HackerRank" },
  ],
  skills: [{ group: "Languages", items: ["TypeScript"] }],
  links: [{ label: "GitHub", href: "https://github.com/x" }],
};

describe("AboutFrontmatter", () => {
  it("parses a complete record", () => {
    const parsed = AboutFrontmatter.parse(valid);
    expect(parsed.location).toBe("New Delhi, India");
    expect(parsed.stats).toHaveLength(4);
    expect(parsed.lede).toContain("*backend half*");
  });

  it("requires exactly 4 stats", () => {
    expect(() => AboutFrontmatter.parse({ ...valid, stats: valid.stats.slice(0, 3) })).toThrow();
  });

  it("requires location and lede", () => {
    const { location: _l, ...noLoc } = valid;
    expect(() => AboutFrontmatter.parse(noLoc)).toThrow();
    const { lede: _le, ...noLede } = valid;
    expect(() => AboutFrontmatter.parse(noLede)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/content/about.test.ts`
Expected: FAIL — unknown/missing fields, no length constraint.

- [ ] **Step 3: Implement the schema additions**

In `lib/content/about.ts`, add a `Stat` schema and extend `AboutFrontmatter`:

```ts
export const Stat = z.object({
  num: z.string().min(1).max(8),
  unit: z.string().max(4).optional(),
  cap: z.string().min(1).max(60),
});

export const AboutFrontmatter = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  photo: z.string().min(1).max(200).optional(),
  resumeUrl: z.string().min(1).max(200).default("/resume.pdf"),
  location: z.string().min(1).max(80),
  availability: z.string().min(1).max(60).optional(),
  lede: z.string().min(1).max(400),
  support: z.string().min(1).max(500),
  stats: z.array(Stat).length(4),
  skills: z.array(SkillGroup).min(1).max(8),
  achievements: z.array(z.string().min(1).max(200)).max(10).default([]),
  links: z.array(AboutLink).min(1).max(8),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/content/about.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the new fields to `content/about.mdx`**

Replace the frontmatter block of `content/about.mdx` (keep the body as-is below the `---`; it is no longer rendered but stays in the file). New frontmatter:

```yaml
---
name: "Harshit Sindhu"
tagline: "Backend-heavy full-stack developer — Node.js, TypeScript, PostgreSQL, React/Next.js"
location: "New Delhi, India"
availability: "Open to opportunities"
lede: "I own the *backend half* of B2B platforms — schema design, 100+ APIs, and the event-driven machinery that keeps data *correct under load*."
support: "At Zykrr I work across a customer-experience analytics platform: an SLA engine with multi-level escalation, a transactional outbox spanning core entities, and the Redis cache behind every entitlement check — plus the Next.js screens that consume them."
resumeUrl: "/resume.pdf"
stats:
  - { num: "~2", unit: "yrs", cap: "building B2B platforms in production" }
  - { num: "100+", cap: "REST APIs designed & shipped" }
  - { num: "400+", cap: "DSA problems solved" }
  - { num: "5", unit: "★", cap: "Problem Solving on HackerRank" }
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
  - "Solved 400+ DSA problems across LeetCode, GeeksforGeeks, and CodeStudio."
  - "5-star rated in Problem Solving on HackerRank."
  - "Completed Walmart USA Advanced Software Engineering virtual program (Forage, 2023)."
links:
  - { label: "GitHub", href: "https://github.com/HArshit123455" }
  - { label: "LinkedIn", href: "https://www.linkedin.com/in/harshit-sindhu/" }
  - { label: "LeetCode", href: "https://leetcode.com/u/Harry_S/" }
  - { label: "Email", href: "mailto:harshitsindhu10@gmail.com" }
---
```

- [ ] **Step 6: Commit**

```bash
git add lib/content/about.ts lib/content/about.test.ts content/about.mdx
git commit -m "feat(about): extend about schema with hero fields (location/lede/support/stats)"
```

---

## Task 3: Icons component

**Files:**
- Create: `components/about/icons.tsx`

- [ ] **Step 1: Write the component**

Create `components/about/icons.tsx`:

```tsx
import type { SVGProps } from "react";

type IconName = "pin" | "briefcase" | "code" | "arrow-right" | "file";

const PATHS: Record<IconName, React.ReactNode> = {
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  code: <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  file: (
    <>
      <path d="M14 3v5h5" />
      <path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7Z" />
    </>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS (no errors referencing `icons.tsx`).

- [ ] **Step 3: Commit**

```bash
git add components/about/icons.tsx
git commit -m "feat(about): add line-icon set (pin/briefcase/code/arrow-right/file)"
```

---

## Task 4: Reveal client component

**Files:**
- Create: `components/about/reveal.tsx`
- Test: `components/about/reveal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/about/reveal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/about/reveal";

describe("Reveal", () => {
  beforeEach(() => {
    // jsdom has no IntersectionObserver; provide a no-op stub
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
  });

  it("renders its children", () => {
    render(
      <Reveal>
        <p>hello body</p>
      </Reveal>
    );
    expect(screen.getByText("hello body")).toBeInTheDocument();
  });

  it("marks children visible immediately when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(
      <Reveal>
        <p>reduced</p>
      </Reveal>
    );
    expect(container.firstChild).toHaveAttribute("data-revealed", "true");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/about/reveal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/about/reveal'` (component not created yet).

- [ ] **Step 3: Implement the component**

Create `components/about/reveal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal data-revealed={revealed} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/about/reveal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/about/reveal.tsx components/about/reveal.test.tsx
git commit -m "feat(about): add Reveal scroll-in wrapper with reduced-motion fallback"
```

---

## Task 5: About CSS block

**Files:**
- Modify: `app/globals.css` (append at end)

- [ ] **Step 1: Append the About CSS block**

Add to the end of `app/globals.css`:

```css
/* ============================================================
   About page — components/about/*
   Tailwind handles most styling; these rules cover the bits that
   are awkward as utilities (timeline connector, current-role
   highlight, stat dividers, scroll-reveal start-state).
   ============================================================ */

/* Scroll-reveal: hidden start-state only when motion is allowed, so
   print / no-JS / reduced-motion always show content. */
@media (prefers-reduced-motion: no-preference) {
  [data-reveal][data-revealed="false"] {
    opacity: 0;
    transform: translateY(16px);
  }
  [data-reveal] {
    transition: opacity 620ms var(--ease), transform 620ms var(--ease);
  }
}

/* Pulsing accent dots (eyebrow / availability / current-role). */
.about-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
  flex-shrink: 0;
}
/* Smaller, ring-less variant for inside pills / badges. */
.about-dot-sm {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
@media (prefers-reduced-motion: no-preference) {
  .about-dot,
  .about-dot-sm { animation: pulse-dot 2.6s var(--ease) infinite; }
}

/* Timeline connector: vertical hairline from each rail to the next. */
.tl-rail { position: relative; }
.tl-rail::after {
  content: "";
  position: absolute;
  left: 31px;
  top: 72px;
  bottom: -34px;
  width: 1px;
  background: linear-gradient(var(--border-strong), transparent);
}
.tl-item:last-child .tl-rail::after { display: none; }
@media (max-width: 560px) {
  .tl-rail::after { left: 23px; top: 56px; }
}

/* Current-role highlight: accent wash + left edge pulled into the gutter. */
.tl-item--now {
  background: linear-gradient(90deg, var(--accent-soft), transparent 62%);
  border-left: 2px solid var(--accent);
  border-radius: 0 16px 16px 0;
  margin-left: -22px;
  padding-left: 22px;
}

/* Stat strip dividers: hairline before every cell except the first. */
.stat + .stat { position: relative; }
.stat + .stat::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 1px;
  background: var(--border);
}
@media (max-width: 560px) {
  /* 2-up: only the left-column cells (odd index) keep a divider */
  .stat:nth-child(odd) + .stat::before { display: none; }
}
```

- [ ] **Step 2: Verify the dev build compiles**

Run: `pnpm build`
Expected: build succeeds (CSS is valid; no Tailwind/PostCSS error).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(about): add scoped About CSS (connector, current-role, stat dividers, reveal)"
```

---

## Task 6: SectionHead component

**Files:**
- Create: `components/about/section-head.tsx`

- [ ] **Step 1: Write the component**

Create `components/about/section-head.tsx`:

```tsx
export function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-[30px] flex items-baseline gap-4">
      <span className="font-mono text-[13px] font-medium tracking-[0.04em] text-accent">{num}</span>
      <h2 className="whitespace-nowrap font-serif text-[clamp(30px,4.4vw,42px)] font-medium leading-none tracking-[-0.022em] text-fg max-[560px]:whitespace-normal">
        {title}
      </h2>
      <span className="h-px flex-1 bg-border max-[560px]:hidden" aria-hidden />
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/section-head.tsx
git commit -m "feat(about): add SectionHead (number + serif title + rule)"
```

---

## Task 7: LogoTile component

**Files:**
- Create: `components/about/logo-tile.tsx`
- Test: `components/about/logo-tile.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/about/logo-tile.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogoTile, monogramFor } from "@/components/about/logo-tile";

describe("monogramFor", () => {
  it("uses the first letter of a single-word name", () => {
    expect(monogramFor("Zykrr")).toBe("Z");
  });
  it("uses up to 3 word initials for multi-word names", () => {
    expect(monogramFor("Engineers India Limited")).toBe("EIL");
    expect(monogramFor("Delhi Technological University")).toBe("DTU");
  });
});

describe("LogoTile", () => {
  it("renders the logo image when a src is given", () => {
    render(<LogoTile name="Zykrr" logo="/logos/zykrr.svg" />);
    expect(screen.getByRole("img", { name: /zykrr/i })).toBeInTheDocument();
  });

  it("renders the monogram when no logo is given", () => {
    render(<LogoTile name="Delhi Technological University" />);
    expect(screen.getByText("DTU")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("falls back to the monogram when the image errors", () => {
    render(<LogoTile name="Zykrr" logo="/logos/zykrr.svg" />);
    fireEvent.error(screen.getByRole("img", { name: /zykrr/i }));
    expect(screen.getByText("Z")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/about/logo-tile.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `components/about/logo-tile.tsx`:

```tsx
"use client";

import { useState } from "react";

export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase()).join("");
}

export function LogoTile({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logo && !failed;

  return (
    <div
      className="grid h-16 w-16 place-items-center overflow-hidden rounded-[15px] border border-border shadow-sm transition-transform duration-200 max-[560px]:h-12 max-[560px]:w-12"
      style={{ background: "#f6f4ee" }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          width={44}
          height={44}
          className="h-11 w-11 object-contain max-[560px]:h-8 max-[560px]:w-8"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-serif text-[18px] font-medium tracking-[-0.01em] text-[#15171a]">
          {monogramFor(name)}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/about/logo-tile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/about/logo-tile.tsx components/about/logo-tile.test.tsx
git commit -m "feat(about): add LogoTile with light chip + monogram fallback"
```

---

## Task 8: AboutHero component

**Files:**
- Create: `components/about/about-hero.tsx`

- [ ] **Step 1: Implement the component**

Create `components/about/about-hero.tsx`. It renders the eyebrow, availability pill, name, two-column lede/aside, and the 4-cell stat strip. The `lede` string uses `*word*` to mark green-italic emphasis — `renderLede` splits on `*` and wraps odd segments in `<em>`.

```tsx
import type { AboutFrontmatterT } from "@/lib/content/about";
import { Icon } from "./icons";

function renderLede(lede: string) {
  return lede.split("*").map((seg, i) =>
    i % 2 === 1 ? (
      <em key={i} className="font-medium not-italic text-accent">
        {seg}
      </em>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

export function AboutHero({ data }: { data: AboutFrontmatterT }) {
  return (
    <section className="pb-[18px] pt-[64px] sm:pt-[92px]">
      {/* eyebrow + availability */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
          <span className="about-dot" aria-hidden />
          About
        </span>
        {data.availability ? (
          <span className="inline-flex items-center gap-2 rounded-pill border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-accent-soft px-[9px] py-1 pr-[11px] font-mono text-[10.5px] text-accent">
            <span className="about-dot-sm" aria-hidden />
            {data.availability}
          </span>
        ) : null}
      </div>

      {/* name */}
      <h1 className="mb-9 mt-4 font-serif text-[clamp(56px,9vw,104px)] font-medium leading-[0.94] tracking-[-0.032em] text-fg">
        {data.name}
      </h1>

      {/* two-column lede / aside */}
      <div className="grid items-end gap-14 max-[760px]:grid-cols-1 max-[760px]:items-start max-[760px]:gap-7 min-[761px]:grid-cols-[1.05fr_0.95fr]">
        <p className="text-balance font-serif text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.16] tracking-[-0.016em] text-fg">
          {renderLede(data.lede)}
        </p>
        <div className="flex flex-col gap-5 pb-1.5">
          <div className="flex flex-wrap gap-x-2.5 gap-y-2">
            <MetaChip icon="pin" label={data.location} />
            <MetaChip icon="briefcase" label="Software Developer @ Zykrr" />
            <MetaChip icon="code" label="TypeScript, end-to-end" />
          </div>
          <p className="text-pretty text-[16px] leading-[1.65] text-muted">{data.support}</p>
        </div>
      </div>

      {/* stat strip */}
      <div className="mt-[34px] flex flex-wrap border-y border-border">
        {data.stats.map((s) => (
          <div
            key={s.cap}
            className="stat min-w-[130px] flex-1 py-5 pr-6 [&:not(:first-child)]:pl-6 max-[560px]:basis-1/2"
          >
            <div className="font-serif text-[42px] font-medium leading-none tracking-[-0.02em] text-fg">
              {s.num}
              {s.unit ? <span className="ml-1 align-baseline text-[18px] text-accent">{s.unit}</span> : null}
            </div>
            <div className="mt-[9px] max-w-[18ch] text-[12.5px] leading-[1.4] text-muted">{s.cap}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetaChip({ icon, label }: { icon: "pin" | "briefcase" | "code"; label: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-pill border border-border bg-bg-elev px-[13px] py-[7px] text-[13px] text-fg-soft">
      <Icon name={icon} className="h-[15px] w-[15px] text-accent" />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/about-hero.tsx
git commit -m "feat(about): add AboutHero (eyebrow, name, lede/aside, stat strip)"
```

---

## Task 9: LogoTimeline component

**Files:**
- Create: `components/about/logo-timeline.tsx`

- [ ] **Step 1: Implement the component**

Create `components/about/logo-timeline.tsx`:

```tsx
import type { ExperienceFrontmatterT } from "@/lib/content/experience";
import { isCurrent } from "@/lib/content/experience";
import { LogoTile } from "./logo-tile";

function periodOf(dates?: string): string {
  if (!dates) return "";
  return dates.replace(/\s*(to|-|–)\s*/i, " — ");
}

export function LogoTimeline({ items }: { items: ExperienceFrontmatterT[] }) {
  return (
    <div className="border-t border-border">
      {items.map((e, i) => {
        const now = isCurrent(e.dates);
        return (
          <div
            key={`${e.employer}-${e.role}-${i}`}
            className={`tl-item group grid grid-cols-[64px_minmax(0,1fr)] gap-[26px] border-b border-border py-8 max-[560px]:grid-cols-[48px_minmax(0,1fr)] max-[560px]:gap-[18px] max-[560px]:py-[26px] ${
              now ? "tl-item--now" : ""
            }`}
          >
            <div className="tl-rail">
              <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                <LogoTile name={e.employer} logo={e.logo} />
              </div>
            </div>

            <div>
              <div className="mb-[9px] flex items-center gap-2.5">
                {e.kind ? (
                  <span className="rounded-[5px] bg-accent-soft px-[9px] py-1 font-mono text-[9.5px] uppercase tracking-[0.10em] text-accent">
                    {e.kind}
                  </span>
                ) : null}
                <span className="h-[3px] w-[3px] rounded-full bg-muted-2" aria-hidden />
                <span className="font-mono text-[12px] text-muted">{periodOf(e.dates)}</span>
                {now ? (
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.10em] text-accent">
                    <span className="about-dot-sm" aria-hidden />
                    Currently
                  </span>
                ) : null}
              </div>

              <h3 className="mb-1 font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.018em] text-fg">
                {e.role}
              </h3>
              <div className="mb-[13px] text-[15px] text-fg-soft">
                <b className="font-semibold">{e.employer}</b>
                {e.location ? <span className="mx-[7px] text-muted-2">·</span> : null}
                {e.location ? <span className="text-muted">{e.location}</span> : null}
              </div>

              {e.summary ? (
                <p className="mb-4 max-w-[58ch] text-pretty text-[14.5px] leading-[1.65] text-muted">
                  {e.summary}
                </p>
              ) : null}

              {e.stack.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.stack.map((s, si) => (
                    <span
                      key={`${s}-${si}`}
                      className="rounded-[4px] bg-bg-sunk px-2 py-0.5 font-mono text-[11px] text-fg-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/logo-timeline.tsx
git commit -m "feat(about): add LogoTimeline (logo rail, connector, current-role highlight)"
```

---

## Task 10: SkillStack component

**Files:**
- Create: `components/about/skill-stack.tsx`

- [ ] **Step 1: Implement the component**

Create `components/about/skill-stack.tsx`:

```tsx
import type { AboutFrontmatterT } from "@/lib/content/about";

export function SkillStack({ skills }: { skills: AboutFrontmatterT["skills"] }) {
  return (
    <div className="flex flex-col gap-3">
      {skills.map((g) => (
        <div key={g.group} className="rounded-[16px] border border-border bg-bg-elev px-6 pb-6 pt-[22px]">
          <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
            {g.group}
          </div>
          <div className="flex flex-wrap gap-2">
            {g.items.map((it, i) => (
              <span
                key={`${it}-${i}`}
                className="inline-flex rounded-pill border border-transparent bg-bg-sunk px-[15px] py-2 text-[14px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
              >
                {it}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/skill-stack.tsx
git commit -m "feat(about): add SkillStack chip cards"
```

---

## Task 11: Achievements component

**Files:**
- Create: `components/about/achievements.tsx`

- [ ] **Step 1: Implement the component**

Create `components/about/achievements.tsx`:

```tsx
import { Icon } from "./icons";

export function Achievements({ items }: { items: string[] }) {
  return (
    <div className="border-t border-border">
      {items.map((a) => (
        <div
          key={a}
          className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-3.5 border-b border-border py-[18px]"
        >
          <span className="mt-0.5 text-accent" aria-hidden>
            <Icon name="arrow-right" className="h-[15px] w-[15px]" />
          </span>
          <p className="text-pretty text-[17px] leading-[1.55] text-fg-soft">{a}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/achievements.tsx
git commit -m "feat(about): add Achievements list"
```

---

## Task 12: CtaCard component

**Files:**
- Create: `components/about/cta-card.tsx`

- [ ] **Step 1: Implement the component**

Create `components/about/cta-card.tsx`:

```tsx
import Link from "next/link";
import type { AboutFrontmatterT } from "@/lib/content/about";
import { Icon } from "./icons";

export function CtaCard({ data }: { data: AboutFrontmatterT }) {
  return (
    <section
      aria-label="Contact and résumé"
      className="mt-7 rounded-[16px] border border-border bg-bg-elev p-8 shadow-md"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a
          href={data.resumeUrl}
          download
          className="inline-flex h-[52px] items-center gap-2 rounded-[12px] bg-accent px-[26px] text-[15px] font-semibold text-accent-ink transition-transform hover:-translate-y-px hover:brightness-[1.04]"
        >
          <Icon name="file" className="h-[18px] w-[18px]" />
          Download résumé (PDF)
        </a>
        <div className="flex flex-wrap gap-x-[22px] gap-y-1.5">
          {data.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-[14.5px] text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
      <p className="mt-[22px] border-t border-border pt-5 text-[15px] text-muted">
        Prefer to dig in?{" "}
        <Link href="/" className="group text-accent">
          Ask my work anything{" "}
          <span className="inline-block transition-transform group-hover:translate-x-[3px]">→</span>
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/about/cta-card.tsx
git commit -m "feat(about): add CtaCard (résumé button + links + ask CTA)"
```

---

## Task 13: Rewrite the About page

**Files:**
- Modify: `app/about/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the page**

Replace the entire contents of `app/about/page.tsx`:

```tsx
import type { Metadata } from "next";
import { loadAbout } from "@/lib/content/about";
import { loadExperience } from "@/lib/content/experience";
import { AboutHero } from "@/components/about/about-hero";
import { SectionHead } from "@/components/about/section-head";
import { LogoTimeline } from "@/components/about/logo-timeline";
import { SkillStack } from "@/components/about/skill-stack";
import { Achievements } from "@/components/about/achievements";
import { CtaCard } from "@/components/about/cta-card";
import { Reveal } from "@/components/about/reveal";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About — Harshit Sindhu",
  description:
    "Backend-heavy full-stack developer. Where I've worked, what I build, and how to reach me.",
};

export default function AboutPage() {
  const { data } = loadAbout();
  const experience = loadExperience();

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <AboutHero data={data} />

      <Reveal>
        <section id="experience" className="scroll-mt-20 pt-[84px]">
          <SectionHead num="01" title="Experience & education" />
          <LogoTimeline items={experience} />
        </section>
      </Reveal>

      <Reveal>
        <section id="skills" className="scroll-mt-20 pt-[84px]">
          <SectionHead num="02" title="What I work with" />
          <SkillStack skills={data.skills} />
        </section>
      </Reveal>

      {data.achievements.length > 0 ? (
        <Reveal>
          <section id="achievements" className="scroll-mt-20 pt-[84px]">
            <SectionHead num="03" title="Achievements" />
            <Achievements items={data.achievements} />
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <CtaCard data={data} />
      </Reveal>

      <Footer />
    </div>
  );
}
```

> Note: the page sits inside the layout shell (`mx-auto max-w-5xl px-6`). `max-w-[1040px]` is a no-op ceiling there but keeps the page correct if the shell ever widens; content effectively fills the ~976px shell, matching the home page.

- [ ] **Step 2: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS — `/about` compiles as a static route.

- [ ] **Step 3: Manual visual check**

Run: `pnpm dev`, open `http://localhost:3000/about`.
Expected: hero with name + lede + stat strip; timeline with monogram tiles (Z / EIL / DTU) and a green "Currently" highlight on Zykrr; skill cards; achievements; CTA. Toggle theme and shrink to mobile width — no overflow, stat strip goes 2-up, hero collapses to one column.

- [ ] **Step 4: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(about): rewrite /about as five-section editorial profile"
```

---

## Task 14: Footer About link (mobile reachability)

**Files:**
- Modify: `components/footer.tsx`

- [ ] **Step 1: Add the About link**

In `components/footer.tsx`, add `import Link from "next/link";` at the top, then add this as the **first** child inside the `<div className="flex flex-wrap gap-2">` link row (before the Email link):

```tsx
        <Link
          href="/about"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          About
        </Link>
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/footer.tsx
git commit -m "feat(footer): add About link (reachable on mobile where header link is hidden)"
```

---

## Task 15: ⌘K palette About-section jumps

**Files:**
- Modify: `components/palette/commands.ts`
- Modify: `components/chrome.tsx`

- [ ] **Step 1: Add the catalog entries**

In `components/palette/commands.ts`, add these three entries to `COMMAND_CATALOG` immediately after the `nav.footer` entry:

```ts
  { id: "nav.experience", label: "Jump to Experience", section: "Navigate", keywords: ["about", "work", "timeline"] },
  { id: "nav.skills", label: "Jump to Skills", section: "Navigate", keywords: ["about", "stack"] },
  { id: "nav.achievements", label: "Jump to Achievements", section: "Navigate", keywords: ["about", "awards"] },
```

- [ ] **Step 2: Add the handler**

In `components/chrome.tsx`, inside `fireCommand`'s `switch`, add this block immediately after the existing `case "nav.footer":` block. The switch already binds `id` (the `fireCommand(id: string)` parameter), so reuse it:

```tsx
      case "nav.experience":
      case "nav.skills":
      case "nav.achievements": {
        const sectionId = id.split(".")[1]; // "experience" | "skills" | "achievements"
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.location.href = `/about#${sectionId}`;
        }
        return;
      }
```

> When fired from a page without the section (e.g. home), it navigates to `/about#<id>`; the global `html { scroll-behavior: smooth }` handles the in-page jump.

- [ ] **Step 3: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run `pnpm dev`, press ⌘K (or Ctrl-K), search "skills" → Enter. From `/about` it scrolls; from `/` it navigates to `/about#skills`.

- [ ] **Step 5: Commit**

```bash
git add components/palette/commands.ts components/chrome.tsx
git commit -m "feat(palette): add About-section jump commands"
```

---

## Task 16: E2E coverage + final verification

**Files:**
- Create: `e2e/about.spec.ts`

- [ ] **Step 1: Write the e2e spec**

Create `e2e/about.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("About page", () => {
  test("renders all five sections", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1, name: "Harshit Sindhu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Experience & education" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What I work with" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download résumé/i })).toBeVisible();
  });

  test("timeline shows the current-role marker", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText("Currently")).toBeVisible();
  });

  test("footer About link is reachable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const aboutLink = page.getByRole("contentinfo").getByRole("link", { name: "About" });
    await aboutLink.scrollIntoViewIfNeeded();
    await aboutLink.click();
    await expect(page).toHaveURL(/\/about$/);
  });
});
```

- [ ] **Step 2: Run the e2e spec**

Run: `pnpm test:e2e e2e/about.spec.ts`
Expected: 3 passed. (If Playwright browsers are missing: `pnpm exec playwright install` first.)

- [ ] **Step 3: Full verification suite**

Run each and confirm:

```bash
pnpm typecheck      # no errors
pnpm lint           # no new errors
pnpm vitest run     # all unit tests pass
pnpm build          # production build succeeds
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add e2e/about.spec.ts
git commit -m "test(about): e2e coverage for sections, current-role, mobile footer nav"
```

---

## Post-implementation: adding real logos (user action, no code change)

1. Create `public/logos/`.
2. Drop in `zykrr.svg`, `engineers-india.svg`, `dtu.svg` (SVG preferred; PNG ≥128px square fine).
3. Reload `/about` — tiles upgrade from monograms to real logos automatically (paths already wired in the experience MDX). Logos render on a light `#f6f4ee` chip so light-background marks stay legible in dark mode.

---

## Self-review notes (coverage check)

- Spec §"Data model changes" → Tasks 1, 2.
- Spec §"Draft copy" → Tasks 1 (summaries), 2 (hero/stats/skills/achievements/links).
- Spec §"Components" → Tasks 3–13 (icons, reveal, section-head, logo-tile, about-hero, logo-timeline, skill-stack, achievements, cta-card, page).
- Spec §"CSS block" → Task 5.
- Spec §"Logos" → Task 7 + post-implementation section.
- Spec §"Mobile nav" → Task 14.
- Spec §"⌘K palette additions" → Task 15.
- Spec §"Responsive plan" → encoded in Tasks 8, 9, 13 (breakpoint utilities) + Task 5 (mobile CSS); verified in Tasks 13, 16.
- Spec §"Testing" → Tasks 1, 2, 4, 7 (unit) + Task 16 (e2e + full suite). Visual-regression screenshots are deferred to the user's local Playwright run (not scripted here, since baseline images must be generated on the user's machine).
```
