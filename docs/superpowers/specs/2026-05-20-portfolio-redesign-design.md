---
title: Portfolio Redesign — editorial restyle + audience-aware chat + projects/now/palette
date: 2026-05-20
status: approved
supersedes: 2026-05-14-reverse-resume-ui-redesign-design.md
source: Claude Design handoff (personal/project/portfolio.html)
---

# Portfolio Redesign

## Goal

Refactor the reverse-resume site from a clean-SaaS chat-only surface (blue + Inter) into an editorial portfolio (warm paper + Cormorant + green accent) that adds five real features on top of the existing citation-grounded RAG chat: audience-aware answer voice, multi-tab structured answers, a projects section with a GitLab activity graph, a "now" strip, and a Cmd-K command palette with easter eggs.

The chat backend (rewrite → retrieve → Sonnet streaming with citations) keeps working unchanged in its retrieval and SSE shape; only the system-prompt assembly learns about audience.

## Constraints

- No new languages, no new infra. Stay inside Next.js 15 / App Router / Tailwind / Postgres-RAG.
- Zero database schema changes (existing `chunks` table + retrieval pipeline are unchanged).
- Each phase ships independently — the site stays coherent if we stop after any phase.
- Visual restyle and chat structural changes happen in different phases so the highest-risk work (audience steering + tabs) ships against a stable visual.
- Honor the existing memory note: Voyage free-tier 429s; Anthropic spend cap enforced; tabs count against the same cap.
- User tests each phase locally on dev before pushing to Vercel.

## Architecture

### Stack additions (per phase)

| Phase | Adds | Touches |
|---|---|---|
| 1 — Visual restyle | Cormorant Garamond, Geist, JetBrains Mono fonts | `app/layout.tsx`, `app/globals.css`, `tailwind.config.js`, `components/theme-toggle.tsx`, `components/header.tsx`, `app/page.tsx` (footer) |
| 2 — Chat rebuild | Audience param, question-bubble thread, sticky follow-up | `components/chat-shell.tsx` (rewrite), `components/citations-panel.tsx` → `sources-rail.tsx`, `lib/rag/generate.ts` (system prompt), `app/api/chat/route.ts` (schema), `content/landing.mdx` (audience-specific suggestion chips) |
| 3 — Tabs (Impact/Code/Story) | Lazy-load tab endpoint, in-memory chunk cache | `app/api/chat/tab/route.ts` (new), `lib/rag/cache.ts` (new), `lib/rag/retrieve.ts` (return chunk IDs to client), `components/chat/answer-card.tsx` (tab orchestration) |
| 4 — Projects + Now + Footer | MDX content loaders, GitLab calendar snapshot | `content/projects/*.mdx`, `content/now.mdx`, `lib/content/projects.ts`, `lib/content/now.ts`, `scripts/fetch-gitlab-calendar.ts`, `content/generated/gitlab-calendar.json`, `package.json` (prebuild hook) |
| 5a — Palette + eggs | Cmd-K, toast, overlays, hint counter | `components/palette/*`, `components/eggs/*`, `components/toast.tsx`, `next/dynamic` imports |
| 5b — Content authoring | MDX entries, voice copy, audience instructions | Content-only PR; no code changes |

### Files added (~16)
```
components/hero.tsx
components/chat/{audience-pills,suggestion-chips,turn,answer-card,answer-tabs,impact-grid,code-tab,story-tab,sticky-followup,chat-input,sources-rail}.tsx
components/projects/{projects-section,project-card,projects-grid,commit-graph}.tsx
components/now/{now-strip,now-card}.tsx
components/palette/{command-palette,command-list}.{tsx,ts}
components/eggs/{love-overlay,sparkle-overlay,matrix-overlay,use-konami,use-love-triggers,use-logo-click-counter,inline-commands}.{tsx,ts}
components/{toast,footer}.tsx
lib/content/{projects,now}.ts
lib/rag/cache.ts
app/api/chat/tab/route.ts
scripts/fetch-gitlab-calendar.ts
content/projects/*.mdx (4-6 entries)
content/now.mdx
content/generated/gitlab-calendar.json
public/resume.pdf (placeholder)
```

### Files modified (~8)
```
app/layout.tsx        — add new fonts, switch theme strategy to data-theme
app/globals.css        — full token rewrite (light + dark + love-mode)
app/page.tsx           — multi-section composition (Hero+Chat / Projects / Now / Footer)
tailwind.config.js    — consume CSS vars instead of hardcoded colors
components/chat-shell.tsx  — wholesale rewrite as orchestrator
components/header.tsx      — serif brand wordmark, Cmd-K hint pill, GitLab icon
components/theme-toggle.tsx — data-theme attribute swap
lib/rag/generate.ts    — accept audience, prepend VOICE_INSTRUCTIONS
app/api/chat/route.ts  — schema gains audience field
content/landing.mdx    — restructure to audience-keyed suggestion chips
```

### Files renamed / removed

- `components/citations-panel.tsx` → `components/chat/sources-rail.tsx` (rewritten in the process — visually a tagged-disclosure card rail, but reuses the existing `CitationsProvider` context). Treated as `git mv` + edit so history is preserved.

Existing components retained and reused unchanged:
`citations-context.tsx`, `markdown-message.tsx`, `shiki-code.tsx`, `citation-marker.tsx`, `transform-citations.tsx`.

## Visual system

### Color tokens (CSS vars)

Light (`html[data-theme="light"]` or no attr):
```
--bg            #f7f5f0   warm cream paper
--bg-elev       #fbfaf6   raised surface
--bg-sunk       #efece4   inset surface (chips, code bg)
--fg            #15171a   primary text
--fg-soft       #2c2f35   body text
--muted         #76787e   metadata, labels
--muted-2       #a8a9ad   tertiary labels
--border        rgba(20,23,26,0.08)
--border-strong rgba(20,23,26,0.14)
--accent        #1a8f4f   forest green
--accent-soft   rgba(26,143,79,0.10)
--accent-ink    #ffffff   ink-on-accent
```

Dark (`html[data-theme="dark"]`):
```
--bg            #0c0d0f
--bg-elev       #131417
--bg-sunk       #08090b
--fg            #f1efe8
--fg-soft       #d2d0c8
--muted         #8c8e94
--muted-2       #54565d
--border        rgba(241,239,232,0.07)
--border-strong rgba(241,239,232,0.14)
--accent        #34d399   mint
--accent-soft   rgba(52,211,153,0.12)
--accent-ink    #0c0d0f
```

Love mode (`html[data-mode="love"]`, both themes):
```
--accent        #e85d8a (light) / #f78fb3 (dark)
--accent-soft   rgba(232,93,138,0.14) / rgba(247,143,179,0.14)
```

### Typography

Via `next/font/google`:
- **Cormorant Garamond** — italic 500/600 → display headlines, project titles, section heads, love-mode toast. CSS var `--serif`.
- **Geist** — 300–700 → body, UI, buttons. CSS var `--sans`.
- **JetBrains Mono** — 400/500 → code, eyebrows, kbd, source paths. CSS var `--mono`.

Inter retained as a system-stack fallback.

### Radii / shadows / motion

```
--radius-sm    6px
--radius      12px
--radius-lg   16px
--radius-pill 999px

--shadow-sm   0 1px 0 rgba(20,23,26,0.03)
--shadow-md   0 1px 0 rgba(20,23,26,0.03), 0 12px 28px -16px rgba(20,23,26,0.10)

--ease        cubic-bezier(0.2, 0.7, 0.2, 1)
```

`prefers-reduced-motion` killswitch preserved from current `globals.css`.

### Selection

```
::selection { background: var(--accent); color: var(--accent-ink); }
```

## Chat rebuild

### Component tree

```
<ChatShell>                          [client]
  <Hero>
    <Eyebrow/>                       pulsing-dot status line
    <Headline/>                      serif, italic accent on "anything"
    <Lede/>
    <AudiencePills audience setAudience/>
  </Hero>
  <ChatGrid>
    <ChatColumn>
      if thread.length === 0:
        <SuggestionChips items={audience-keyed} onPick/>
        <ChatInput variant="hero" onSubmit/>
      else:
        <Thread>
          {thread.map(turn => <Turn key turn/>)}
        </Thread>
        <StickyFollowup onSubmit onClear/>
    </ChatColumn>
    <SourcesRail citations/>
  </ChatGrid>
</ChatShell>
```

### State shape

```ts
type Audience = "curious" | "recruiter" | "engineer";
type Turn = { q: string; audience: Audience; chunkIds: string[]; messageId: string };
type ThreadState = { audience: Audience; turns: Turn[]; activeTurnId: string | null };
```

`audience` persists to `localStorage` under `rr_audience`. Default: `"curious"` on first visit.

### Audience system-prompt steering

`lib/rag/generate.ts` accepts `audience` and prepends one of three voice blocks before the existing system prompt:

```ts
const VOICE_INSTRUCTIONS: Record<Audience, string> = {
  curious:   "...plain English, no jargon, narrative-led...",
  recruiter: "...lead with quantified outcomes, business impact, scope...",
  engineer:  "...lead with code, tradeoffs, design decisions, mention specific files...",
};
```

Exact wording drafted in Phase 5b (Content authoring).

Retrieval, chunk selection, citation parsing, SSE event shape — all unchanged.

### Lazy tab loading (Phase 3)

`AnswerCard` keeps four tab states: `tldr` (always streams from initial call), `impact | code | story` (lazy on first click).

```
POST /api/chat/tab
{
  question:  string,
  audience:  Audience,
  chunkIds:  string[],        // returned from initial /api/chat
  tab:       "impact" | "code" | "story"
}
```

- **Impact**: focused LLM call. System prompt: "extract 3 quantified outcomes from these chunks, output JSON `{items: [{num, unit, label}]}`". Zod-validated; retries once on parse failure; falls back to `"couldn't extract numbers — see TL;DR"` empty state.
- **Code**: deterministic. Server picks highest-ranked chunk where `sourceType === "github"` or `metadata.language` is set. No LLM call. Returns `{file, language, lines}`. Renders via existing `ShikiCode`.
- **Story**: streamed LLM call. System prompt: "tell this as narrative, lead with the moment of friction". Returns SSE token stream.

**Chunk cache** (`lib/rag/cache.ts`): in-memory LRU keyed by `sha256(question + audience)`, value is chunk ID list. TTL 10 min, max 200 entries. Tab requests look up chunks by ID from Postgres (single indexed query) — avoids re-running rewrite + Voyage embed + retrieval.

Single-region Vercel deploy → in-memory cache is fine. If we ever go multi-region, replace with a Postgres-backed cache table.

### Sticky follow-up

`StickyFollowup` is `position: sticky; bottom: 20px` desktop, `position: fixed; bottom: 0` mobile (≤640px). Backdrop blur + elevated shadow. Z-index `5` (above thread, below modal `100`, below toast `200`).

### Source rail

Replaces `<CitationsPanel/>`. Each citation renders as a card:

```
┌─ [1] ──────────── production ─┐
│  check.ts                     │
│  harshits/infra/ratelimit/    │
│  ▶ Show excerpt               │
└────────────────────────────────┘
```

Tag mapping:
- `chunk.metadata.tag` if set (per-MDX override)
- else by `sourceType`: `github → "production"`, `experience → "experience"`, `snippet → "snippet"`

Mobile: rail collapses to a `<details>` accordion as today.

## Backend changes

### `/api/chat` (modified)

Schema gains `audience` (optional, defaults to `curious`):
```ts
const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1),
  audience: z.enum(["curious", "recruiter", "engineer"]).default("curious"),
});
```

After retrieval, server emits an `init` SSE event with `{messageId, chunkIds}` so the client can later request tabs against the same chunks.

### `/api/chat/tab` (new)

```
POST /api/chat/tab
Body: { messageId, audience, tab }
Response: SSE for "story", JSON for "impact" & "code"
```

Rate-limit + spend-cap reuse the existing helpers (`consume`, `checkCap`). Tab calls count against the same daily cap.

### `lib/rag/cache.ts` (new)

```ts
type CacheEntry = { chunkIds: string[]; question: string; audience: Audience; storedAt: number };
const cache = new LRU<string, CacheEntry>({ max: 200, ttl: 10 * 60 * 1000 });

export function cacheChunks(messageId: string, entry: CacheEntry): void;
export function getChunks(messageId: string): CacheEntry | undefined;
```

Uses `lru-cache` (already widely-used minimal dep — adds ~3KB).

## Projects + Commit Graph + Now strip

### Projects MDX shape

```yaml
---
title: "Reverse Resume"
slug: "reverse-resume"
year: "2026"
kind: "Side project"            # "Side project" | "OSS" | "Bootstrapped" | "Experiment"
status: "live"                   # "live" | "archived"
description: "Citation-grounded RAG over my own work history…"
tags: ["TypeScript", "Next.js", "Postgres", "RAG"]
stats:
  - { label: "Repos indexed", val: "4" }
  - { label: "Snippets",       val: "30+" }
url: "https://github.com/HArshit123455/reverse-resume"
order: 1                         # optional, breaks year ties
---
```

`lib/content/projects.ts` reads all MDX files, validates via zod, sorts by `(year desc, order asc)`.

### Commit Graph (GitLab)

`scripts/fetch-gitlab-calendar.ts`:
```ts
const res = await fetch("https://gitlab.com/users/harshit_sindhu/calendar.json");
const calendar: Record<string, number> = await res.json();  // { "2025-05-20": 4, ... }
// Bucket to 53 weeks × 7 days ending on today.
// Levels: 0 (no commits), 1 (1-3), 2 (4-7), 3 (8-15), 4 (16+) — or quantiles if user prefers.
// Write to content/generated/gitlab-calendar.json
```

Wired via `package.json`:
```json
"scripts": {
  "prebuild": "tsx scripts/fetch-gitlab-calendar.ts || echo 'using cached calendar'",
  ...
}
```

The `|| echo` ensures a network failure doesn't break the build — falls back to the committed snapshot. First run with no snapshot falls back to a seeded deterministic pattern.

`<CommitGraph/>` imports the JSON at module load (server component, zero client JS), renders 53×7 grid, color-mix accent gradient per `data-l="0..4"`, hover tooltip via native `title=`.

### Now MDX shape

```yaml
---
updated: "2026-05-20"
items:
  - { kind: "Building",  title: "Reverse Resume",                 desc: "Citation-grounded RAG over my own work — every claim cites real code." }
  - { kind: "Reading",   title: "Designing Data-Intensive Apps", desc: "Re-read; different chapters hit differently each pass." }
  - { kind: "Learning",  title: "Rust ownership for real",       desc: "Small TUI to feel the borrow checker." }
  - { kind: "Listening", title: "Signals & Threads",             desc: "Jane Street's engineering podcast." }
---
```

Kind → icon: `Building → spark`, `Reading → file`, `Learning → code`, `Listening → terminal`.

## Cmd-K palette + easter eggs

### Palette sections

1. **Navigate** — Ask (↩), Jump to Work (W), Jump to Now (N), Jump to Footer (↓)
2. **Audience** — Switch view → Curious (1) / Recruiter (2) / Engineer (3)
3. **Connect** — LinkedIn, GitHub, GitLab, Email
4. **Settings** — Toggle theme (T), Download résumé (R) → `/resume.pdf` (placeholder PDF dropped in `public/`)
5. **Hidden** (only on search match): "For someone you love ♥", "Tell me a joke", "Activate Konami mode", "Enter the Matrix" (search `matrix`), "Roll the credits"

### Easter eggs

| Egg | Trigger | Effect | Duration |
|---|---|---|---|
| Konami | `↑↑↓↓←→←→ B A` global keydown (ignored when input focused) | Sparkle burst overlay | 3.2s |
| Matrix | Palette search "matrix" → click | Full-viewport canvas katakana rain in accent color | 8s |
| Love | Chat input matches trigger word OR palette "For someone you love ♥" | Hearts overlay + rose vignette + accent shifts to `#e85d8a` + serif italic toast | 7s |
| sudo | Chat input starts with `sudo` | Toast: `> {input}\n[sudo] permission granted. you're cool.` | 3.2s |
| whoami | Chat input matches `whoami` or `/whoami` | Toast: `harshit · full-stack · uid=1337 · groups=builders, readers, listeners` | 3.2s |
| Brand hints | Click brand wordmark 5/10/15 times | Toast hints (texts drafted in Phase 5b — final wording reviewed in spec review) | 3.2s each |

### Love mode triggers + messages

```ts
const LOVE_TRIGGERS = ["mumma", "papa", "didi", "doraemon", "laal mirch", "love", "love you", "miss you", "harshit❤"];
const LOVE_MESSAGES: Record<string, string> = {
  "mumma":      "Hi Mumma. He loves you.",
  "papa":       "Hi Papa. He's working hard.",
  "didi":       "Hi Didi. He misses you.",
  "doraemon":   "Hi Doraemon, Muaahh bby.",
  "laal mirch": "Laal mirch ka Kaala jaadu, hehe.",
  "miss you":   "He misses you too.",
  "love":       "Loved right back.",
  "love you":   "Loved right back.",
  "harshit❤":  "Caught you smiling. Take a break — the code's not going anywhere.",
};
// Fallback for any other trigger in the list: "For you, with love. ♥"
```

Word-boundary regex match: `^|\s|[!.?,]` … `\s|[!.?,]|$`. Case-insensitive. "lover" must not match "love".

### Lazy-loading

All overlays via `next/dynamic({ ssr: false })`. Palette + toast in the initial bundle (~6KB est. gzipped). Overlays load on first trigger.

### Accessibility

- Palette: `role="dialog"`, focus trap, returns focus to trigger on close.
- Toast: `aria-live="polite"`.
- Overlays: `aria-hidden="true"`.
- `prefers-reduced-motion`: Konami/Love/Sparkle/Matrix → toast only, no animation.
- Konami keydown listener ignores when `document.activeElement` is an input/textarea.

## Content I need from the user (Phase 5b targets)

| What | Where | Notes |
|---|---|---|
| 4–6 project entries | `content/projects/*.mdx` | I draft from `content/experience/*.mdx` + public GitLab repos; user reviews/edits |
| 4 "now" items | `content/now.mdx` | I seed plausible defaults; user replaces |
| Audience voice blurbs | Inline in `audience-pills.tsx` | I draft 3 (≤8 words each) |
| Hero eyebrow text | Inline in `hero.tsx` (currently "Open to senior/mid full-stack roles · Delhi / Remote") | User confirms accuracy |
| Brand subtitle | `header.tsx` (currently "Full-stack engineer") | User confirms |
| Hero headline + lede | `content/landing.mdx` | Keep current "Ask my work anything." — possibly tweak lede |
| Audience-keyed suggestion chips | `content/landing.mdx` (restructure to `{ curious: [], recruiter: [], engineer: [] }`) | I draft 5 per audience based on indexed content |
| Brand-click hint texts (3) | `use-logo-click-counter.ts` | I drafted; user tweaks wording in spec review |
| Footer mono line | `footer.tsx` | I draft per mock pattern |
| `VOICE_INSTRUCTIONS` per audience | `lib/rag/generate.ts` | I draft ~80 words each |
| Résumé PDF | `public/resume.pdf` | User provides actual PDF; I drop a placeholder |
| OG image + meta tags | `app/layout.tsx`, `app/opengraph-image.tsx` | I draft static OG; user can swap |

## Testing strategy

### Preserved
All existing vitest tests pass:
- `components/theme-toggle.test.tsx` (updated to assert `data-theme` attr)
- `components/citation-marker.test.tsx`
- `components/markdown-message.test.tsx`
- `components/transform-citations.test.tsx`
- `lib/rag/citation-parser.test.ts`
- `lib/rag/retrieve.test.ts`
- `lib/rate-limit/*.test.ts`
- `lib/spend-cap/*.test.ts`
- `lib/clients/voyage.test.ts`
- `lib/ingest/*.test.ts`
- `evals/retrieval.eval.ts`

### Added
- `components/chat/audience-pills.test.tsx` — selection persists to localStorage; aria-roles correct.
- `components/chat/answer-card.test.tsx` — tab switching; lazy-load triggers fetch only on first click; loading/error states.
- `components/eggs/use-love-triggers.test.ts` — all triggers match with word boundaries; "lover" doesn't match "love"; case-insensitive; emoji trigger works.
- `components/palette/command-palette.test.tsx` — keyboard navigation, Esc closes, search filters, hidden commands only on match.
- `lib/rag/cache.test.ts` — TTL eviction, LRU eviction, miss returns undefined.
- `lib/content/projects.test.ts` — frontmatter validation, sort order.
- `e2e/audience-switch.spec.ts` — pill click re-asks with new voice.
- `e2e/sticky-followup.spec.ts` — appears on second turn, stays sticky on scroll.
- `e2e/source-card.spec.ts` — expand/collapse, mobile accordion.
- `e2e/palette.spec.ts` — Cmd-K opens, all sections render, Esc closes.
- `e2e/konami.spec.ts` — sequence triggers sparkle overlay.
- `e2e/love-mode.spec.ts` — typing "mumma" in chat input triggers hearts, accent shifts, toast appears.
- `evals/audience-voice.eval.ts` — recruiter answers lead with a quantified outcome (regex on first sentence); engineer answers reference at least one file path; curious answers stay under Flesch–Kincaid grade ~10.

### Visual regression
Playwright `expect(page).toHaveScreenshot()` for:
- Hero (light + dark)
- Empty-state chat (light + dark)
- Mid-thread chat with 1 turn (light + dark)
- Projects section (desktop + mobile)
- Now strip
- Footer
- Palette open
- Love overlay (frozen frame)

## Rollout

- Each phase merges to `main` and deploys to Vercel preview. User tests on dev locally first, then preview, then production.
- Voyage rate-limit handling added in Phase 3: tab calls reuse cached chunks, so no re-embedding required.
- Anthropic spend cap stays at the env-configured daily limit; tab calls counted.
- Memory updated after Phase 1 ships (visual restyle live), after Phase 3 ships (audience+tabs live), after Phase 5 ships (palette+eggs live + content shipped).

## Open items deferred to spec review

- Exact wording of the 3 brand-click hint texts (drafted; user wants to tweak).
- Exact wording of the audience voice blurbs and `VOICE_INSTRUCTIONS` system-prompt blocks (drafted in Phase 5b).
- Final list of 4–6 projects to feature (I propose; user confirms).
- Eyebrow line accuracy ("Open to senior/mid full-stack roles · Delhi / Remote" — user confirms or rewrites).
- Whether to add a 16th love trigger or remove any (current list approved; locked unless user changes).

## Out of scope

- Multi-region Vercel deployment (cache stays in-memory; rework if/when needed).
- Real-time GitLab sync (build-time snapshot is enough).
- Multi-language support.
- User accounts / saved conversations.
- A/B testing infrastructure.
- The Tweaks Panel from the design mock (it's a design-tool artifact, not a portfolio feature).
