# Phase 2 — Chat Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the chat surface around three audiences (curious / recruiter / engineer) with a Turn-based thread, sticky follow-up input, and a renamed `SourcesRail`. The backend learns about audience and emits a forward-looking `init` SSE event so Phase 3 (tabs) can later look up cached chunks by `messageId`. Finish the Phase-1 carryover (last legacy-alias usages) and delete the alias layer so Tailwind only ships the new token system.

**Architecture:** Three layers move together — (1) **backend** gains an `audience` field on `/api/chat`, prepends a `VOICE_INSTRUCTIONS` block in `lib/rag/generate.ts`, and emits an `init { messageId, chunkIds }` SSE event right after retrieval; (2) **state** moves from a flat `messages[]` list to a `turns: Turn[]` list where each `Turn` carries `{ id, q, a, audience, chunkIds, status }` — citations stay scoped via the existing `CitationsProvider` but reset per question; (3) **UI** decomposes the old monolithic `ChatShell` into `Hero` + `AudiencePills` + `SuggestionChips` (or `Thread` of `Turn`s) + `StickyFollowup` + `SourcesRail`. The legacy CSS alias layer (`--surface`, `--text-soft`, `--code-bg`, `--accent-bg`, `--highlight`) gets deleted in the same phase so every component lands on the canonical token set.

**Tech Stack:** Next.js 15 App Router, React 19 (`useState` + `useEffect`, `crypto.randomUUID`), Tailwind 3.4 (CSS-var-driven theme), Anthropic SDK with prompt caching, Voyage embed+rerank, `localStorage` for audience persistence, vitest + @testing-library/react, Playwright e2e.

---

## File Structure

**Modify:**
- `components/shiki-code.tsx:61,69` — replace `bg-code-bg`, `bg-surface`, `text-text-soft`, `hover:text-text` with new tokens
- `components/citation-marker.tsx:50,58` — replace `bg-accent-bg`, `hover:text-surface`, `bg-text`, `text-surface` with new tokens
- `lib/sse.ts` — add `init` variant to `ServerEvent`
- `app/api/chat/route.ts` — schema gains optional `audience`; emit `init` event after retrieval
- `lib/rag/generate.ts` — accept `audience`; prepend `VOICE_INSTRUCTIONS` block
- `content/landing.mdx` — restructure `demoPrompts` → `suggestionChips: { curious, recruiter, engineer }`
- `app/page.tsx` — load new chip shape; mount the new `<Hero>` + `<ChatShell>` composition
- `components/chat-shell.tsx` — wholesale rewrite as orchestrator
- `app/globals.css` — delete the legacy alias blocks (lines 22–27 and 54–59 of the current file)
- `tailwind.config.cjs` — delete the legacy alias color entries (lines 22–27 of the current file)

**Create:**
- `components/hero.tsx` — eyebrow + serif headline + lede + `<AudiencePills>`
- `components/chat/audience-pills.tsx` — segmented control, persists to `localStorage["rr_audience"]`
- `components/chat/audience-pills.test.tsx` — persistence + a11y test
- `components/chat/suggestion-chips.tsx` — renders 5 chips per audience
- `components/chat/chat-input.tsx` — hero-state input row (textarea + Ask button)
- `components/chat/turn.tsx` — one question/answer pair
- `components/chat/sticky-followup.tsx` — mid-thread input row, sticky/fixed responsive, with Clear button
- `components/chat/sources-rail.tsx` — renamed from `components/citations-panel.tsx`, with new tag mapping
- `e2e/audience-switch.spec.ts`
- `e2e/sticky-followup.spec.ts`
- `e2e/source-card.spec.ts`

**Delete:**
- `components/citations-panel.tsx` (renamed to `components/chat/sources-rail.tsx` via `git mv` then edited)

**Rename:**
- `components/citations-panel.tsx` → `components/chat/sources-rail.tsx`

---

## Task 1: Finish Phase 1 carryover — migrate shiki-code + citation-marker onto new tokens

**Files:**
- Modify: `components/shiki-code.tsx:61,69`
- Modify: `components/citation-marker.tsx:50,58`

These files still use Phase-1-legacy aliases (`bg-code-bg`, `bg-surface`, `text-text-soft`, `hover:text-text`, `bg-accent-bg`, `hover:text-surface`, `bg-text`, `text-surface`). Phase 2 will delete the alias layer in Task 12 — these have to land on canonical tokens first or they render unstyled.

- [ ] **Step 1: Update `components/shiki-code.tsx` className on the outer container (line 61)**

Find:
```tsx
      className="group relative my-3 overflow-hidden rounded-lg border border-border bg-code-bg"
```
Replace with:
```tsx
      className="group relative my-3 overflow-hidden rounded-lg border border-border bg-bg-sunk"
```

- [ ] **Step 2: Update `components/shiki-code.tsx` className on the copy button (line 69)**

Find:
```tsx
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-soft opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
```
Replace with:
```tsx
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-bg-elev px-2 py-1 text-[11px] text-fg-soft opacity-0 transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
```

- [ ] **Step 3: Update `components/citation-marker.tsx` className on the marker button (line 50)**

Find:
```tsx
        className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-accent-bg px-1.5 text-[10px] font-medium leading-none text-accent transition-colors hover:bg-accent hover:text-surface"
```
Replace with:
```tsx
        className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-accent-soft px-1.5 text-[10px] font-medium leading-none text-accent transition-colors hover:bg-accent hover:text-accent-ink"
```

Rationale: `hover:text-surface` was wrong even before — the accent foreground should be `--accent-ink` (white in light, near-black in dark), not the elevated surface color.

- [ ] **Step 4: Update `components/citation-marker.tsx` className on the tooltip (line 58)**

Find:
```tsx
          className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-md bg-text px-3 py-2 text-xs leading-relaxed text-surface shadow-token [@media(hover:none)]:hidden"
```
Replace with:
```tsx
          className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-md bg-fg px-3 py-2 text-xs leading-relaxed text-bg shadow-md [@media(hover:none)]:hidden"
```

Rationale: tooltip is "ink-on-paper" — `bg-fg` (near-black) + `text-bg` (cream). `shadow-token` was the legacy alias for `shadow-sm`; we promote to `shadow-md` because tooltips deserve elevation.

- [ ] **Step 5: Run typecheck + tests to confirm nothing broke**

Run: `pnpm typecheck && pnpm test`
Expected: PASS — no test asserts on the changed class strings; the citation-marker test only checks roles/labels.

- [ ] **Step 6: Manual visual check in dev**

Run: `pnpm dev`
1. Open http://localhost:3000, send the first demo question
2. Expand a citation excerpt — verify the Shiki code block reads with the warm sunken background and the Copy button (hover) reads correctly in both light and dark
3. Hover a `[1]` citation marker — verify the inline tooltip shows ink-on-paper styling (near-black background, cream text); confirm it pops cleanly in dark mode too (cream background, near-black text)

- [ ] **Step 7: Commit**

```bash
git add components/shiki-code.tsx components/citation-marker.tsx
git commit -m "fix(tokens): finish Phase 1 token migration on shiki-code + citation-marker

Last two files still using --surface / --text-soft / --code-bg / --accent-bg /
--highlight legacy aliases. Phase 2 deletes the alias layer in Tailwind +
globals.css — these had to land on canonical tokens first.

Also fixes the citation-marker tooltip's hover state: 'hover:text-surface'
was always wrong (should have been --accent-ink) and the tooltip background
swapped from 'bg-text' (legacy) to 'bg-fg' with shadow-md for proper elevation."
```

---

## Task 2: Backend — audience param, VOICE_INSTRUCTIONS, init SSE event

**Files:**
- Modify: `lib/sse.ts`
- Modify: `app/api/chat/route.ts`
- Modify: `lib/rag/generate.ts`

This task wires the audience field end-to-end on the wire format and emits the forward-looking `init { messageId, chunkIds }` event Phase 3 needs. No client-side consumer yet — the client is rewritten in Task 11.

- [ ] **Step 1: Add `init` variant + `Audience` export to `lib/sse.ts`**

Replace the entire content of `lib/sse.ts` with:

```ts
// lib/sse.ts
export type Audience = "curious" | "recruiter" | "engineer";

export type ServerEvent =
  | { type: "init"; messageId: string; chunkIds: string[] }
  | { type: "token"; text: string }
  | { type: "citation"; n: number; chunk: unknown }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "rate_limited"; retryAfterSeconds: number }
  | { type: "spend_capped"; message: string };

export function encodeSse(event: ServerEvent): Uint8Array {
  const json = JSON.stringify(event);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

export function makeSseStream(): {
  stream: ReadableStream<Uint8Array>;
  send: (event: ServerEvent) => void;
  close: () => void;
} {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });
  return {
    stream,
    send(event) {
      try {
        controller.enqueue(encodeSse(event));
      } catch {
        // stream already closed (e.g. client disconnect)
      }
    },
    close() {
      controller.close();
    },
  };
}
```

Only two lines change vs. the existing file: the `Audience` export at the top and the new `init` variant in the union.

- [ ] **Step 2: Update `lib/rag/generate.ts` to accept audience + prepend VOICE_INSTRUCTIONS**

Find this block at the top of `lib/rag/generate.ts`:
```ts
import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import { CitationStreamParser, type StreamEvent } from "./citation-parser";
import type { RetrievedChunk } from "./retrieve";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;
```

Add a new import right under it and a `VOICE_INSTRUCTIONS` map:
```ts
import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import { CitationStreamParser, type StreamEvent } from "./citation-parser";
import type { RetrievedChunk } from "./retrieve";
import type { Audience } from "@/lib/sse";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

// VOICE_INSTRUCTIONS — Phase 2 placeholders. Phase 5b (Content authoring)
// will polish the wording with the user. The shapes here are stable; the
// strings are what get tuned.
const VOICE_INSTRUCTIONS: Record<Audience, string> = {
  curious:
    "Audience: a curious reader exploring this portfolio. Use plain English. Avoid jargon when a normal word works. Lead with the story or the human problem, not the implementation. Short paragraphs. It's OK to be a little playful.",
  recruiter:
    "Audience: a technical recruiter or hiring manager. Lead with quantified outcomes, scope, and business impact in the first sentence. State the role and the team size where relevant. Keep code talk minimal — link to the artifact via [n] instead. Bias toward results over process.",
  engineer:
    "Audience: a senior engineer reviewing this work. Lead with the design decision and the tradeoff. Name specific files, modules, or functions when citing. Show code where it adds signal. Acknowledge what you'd do differently. Be concrete; skip the marketing layer.",
};
```

- [ ] **Step 3: Add `audience` to `GenerateOptions` and prepend the voice block to the system prompt**

In `lib/rag/generate.ts`, find:

```ts
export interface GenerateOptions {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  chunks: RetrievedChunk[];
  signal?: AbortSignal;
}
```

Replace with:

```ts
export interface GenerateOptions {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  chunks: RetrievedChunk[];
  audience: Audience;
  signal?: AbortSignal;
}
```

Then find the `generate` function's body:

```ts
  const { history, chunks, signal } = options;
  const parser = new CitationStreamParser(chunks);

  // Use beta.promptCaching.messages.stream for cache_control support on system blocks.
  // Core.RequestOptions includes `signal` for abort handling.
  const stream = anthropic().beta.promptCaching.messages.stream(
    {
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: renderChunksAsContext(chunks) },
      ],
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    },
    { signal }
  );
```

Replace with:

```ts
  const { history, chunks, audience, signal } = options;
  const parser = new CitationStreamParser(chunks);

  // Prepend the audience voice block as its own (non-cached) system text.
  // SYSTEM_PROMPT stays the ephemeral-cached block so the cache stays warm
  // across audience switches.
  const stream = anthropic().beta.promptCaching.messages.stream(
    {
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: VOICE_INSTRUCTIONS[audience] },
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: renderChunksAsContext(chunks) },
      ],
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    },
    { signal }
  );
```

- [ ] **Step 4: Update `app/api/chat/route.ts` schema + emit init event**

Find the zod schema near the top:

```ts
const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1),
});
```

Replace with:

```ts
const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1),
  audience: z.enum(["curious", "recruiter", "engineer"]).default("curious"),
});
```

- [ ] **Step 5: In `app/api/chat/route.ts`, emit `init` right after retrieval and pass audience into `generate()`**

Find this block (currently around lines 67–83):

```ts
      // 3. Rewrite, retrieve, generate
      const rewritten = await rewriteQuery(database, body.data.messages);
      const chunks = await retrieve(database, rewritten, { topK: 5 });

      // 4. Re-check cap before expensive Sonnet call
      const cap2 = await checkCap(database, capCents);
      if (!cap2.ok) {
        send({ type: "spend_capped", message: "Daily budget hit during request — try again later." });
        send({ type: "done" });
        close();
        return;
      }

      const abortController = new AbortController();
      req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

      for await (const event of generate(database, {
        history: body.data.messages,
        chunks,
        signal: abortController.signal,
      })) {
        send(event);
      }
```

Replace with:

```ts
      // 3. Rewrite, retrieve, generate
      const rewritten = await rewriteQuery(database, body.data.messages);
      const chunks = await retrieve(database, rewritten, { topK: 5 });

      // 3a. Announce the message-id + retrieved chunk ids so the client can
      //     later request follow-up tabs (Phase 3) against the same chunks.
      const messageId = crypto.randomUUID();
      send({
        type: "init",
        messageId,
        chunkIds: chunks.map((c) => String(c.id)),
      });

      // 4. Re-check cap before expensive Sonnet call
      const cap2 = await checkCap(database, capCents);
      if (!cap2.ok) {
        send({ type: "spend_capped", message: "Daily budget hit during request — try again later." });
        send({ type: "done" });
        close();
        return;
      }

      const abortController = new AbortController();
      req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

      for await (const event of generate(database, {
        history: body.data.messages,
        chunks,
        audience: body.data.audience,
        signal: abortController.signal,
      })) {
        send(event);
      }
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — the union widened (init event) is permissible because `makeSseStream` typing already accepts `ServerEvent`; the `generate` signature change is type-checked through `GenerateOptions`.

- [ ] **Step 7: Run unit tests**

Run: `pnpm test`
Expected: PASS — no existing test asserts the system-block count or the exact init wire format. (If `lib/rag/generate.test.ts` or any test directly calls `generate(...)`, it will fail at type-check level because `audience` is now required. None exists today — check via `git grep "from .*generate"` if unsure.)

- [ ] **Step 8: Commit**

```bash
git add lib/sse.ts lib/rag/generate.ts app/api/chat/route.ts
git commit -m "feat(chat): audience param, VOICE_INSTRUCTIONS, init SSE event

/api/chat now accepts audience: curious | recruiter | engineer (default
curious). generate() prepends an audience-specific voice block before
SYSTEM_PROMPT — the cached system block stays warm across audience
switches because the voice block is its own (non-cached) text block.

The new 'init' SSE event ({messageId, chunkIds}) is emitted right after
retrieval. No client consumer yet — wired in Task 11. Phase 3 will use
messageId to look up cached chunks for tab calls.

VOICE_INSTRUCTIONS wording here is a Phase-2 placeholder; Phase 5b polishes
the exact copy with the user."
```

---

## Task 3: Restructure `content/landing.mdx` for audience-keyed suggestion chips

**Files:**
- Modify: `content/landing.mdx`

The current `demoPrompts: string[]` becomes `suggestionChips: { curious: [], recruiter: [], engineer: [] }`. Each list holds 5 prompts so the chip rail feels considered, not random.

- [ ] **Step 1: Replace `content/landing.mdx` frontmatter**

Overwrite `content/landing.mdx` entirely with:

```mdx
---
headline: "Ask my work anything."
subheadline: "Every claim cites real code, real production experience, real artifacts. No marketing — just verifiable evidence."
suggestionChips:
  curious:
    - "What kind of work do you actually do?"
    - "Tell me a story about debugging something hard"
    - "What's a project you're proud of?"
    - "Why did you build this site?"
    - "What do you find most fun about engineering?"
  recruiter:
    - "Have you owned a feature end-to-end in production?"
    - "What's the biggest scale problem you've solved?"
    - "Tell me about a time you reduced cost or latency"
    - "What's your most senior responsibility to date?"
    - "Have you led or mentored other engineers?"
  engineer:
    - "Show me how you built production rate limiting"
    - "How do you handle the outbox pattern at scale?"
    - "Walk me through your Postgres partitioning strategy"
    - "Why TypeScript and not Python on the backend?"
    - "What's a tradeoff you made and would revisit?"
---
```

Note: the chip lists are Phase-2 drafts — Phase 5b lets the user re-author them. The shape is what matters for now.

- [ ] **Step 2: Verify nothing else reads `landing.demoPrompts`**

Run:
```bash
git grep -n "demoPrompts" -- "*.ts" "*.tsx" "*.mdx"
```
Expected: only `app/page.tsx` and `components/chat-shell.tsx` reference it. Both are rewritten in this phase (Tasks 11 + 12).

No commit yet — this content change ships with the chat-shell rewrite in Task 12. Leave the file uncommitted; subsequent tasks build atop it.

(If you prefer a clean separate commit at this point, that's also fine — pick one but don't do both.)

---

## Task 4: Create `components/chat/audience-pills.tsx` + test

**Files:**
- Create: `components/chat/audience-pills.tsx`
- Create: `components/chat/audience-pills.test.tsx`

A segmented control with three pills. Reads/writes `localStorage["rr_audience"]`. Calls back to parent on change. Default: `"curious"`.

- [ ] **Step 1: Write the failing test**

Create `components/chat/audience-pills.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudiencePills } from "./audience-pills";

describe("AudiencePills", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders three radio-style buttons with accessible labels", () => {
    render(<AudiencePills audience="curious" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /curious/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /recruiter/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /engineer/i })).toBeInTheDocument();
  });

  it("marks the active pill with aria-checked", () => {
    render(<AudiencePills audience="recruiter" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /recruiter/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /curious/i })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange and writes to localStorage on click", () => {
    const onChange = vi.fn();
    render(<AudiencePills audience="curious" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /engineer/i }));
    expect(onChange).toHaveBeenCalledWith("engineer");
    expect(localStorage.getItem("rr_audience")).toBe("engineer");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run components/chat/audience-pills.test.tsx`
Expected: FAIL — module `./audience-pills` not found.

- [ ] **Step 3: Create `components/chat/audience-pills.tsx`**

```tsx
"use client";

import type { Audience } from "@/lib/sse";

const OPTIONS: Array<{ value: Audience; label: string; blurb: string }> = [
  { value: "curious", label: "Curious", blurb: "Tell me a story" },
  { value: "recruiter", label: "Recruiter", blurb: "Show me outcomes" },
  { value: "engineer", label: "Engineer", blurb: "Show me code" },
];

interface AudiencePillsProps {
  audience: Audience;
  onChange: (next: Audience) => void;
}

export function AudiencePills({ audience, onChange }: AudiencePillsProps) {
  function handle(next: Audience) {
    onChange(next);
    try {
      localStorage.setItem("rr_audience", next);
    } catch {
      // localStorage unavailable (private mode, etc.) — silent fall-through
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose audience"
      className="inline-flex flex-wrap items-center gap-1.5 rounded-pill border border-border bg-bg-elev p-1"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === audience;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} — ${opt.blurb}`}
            onClick={() => handle(opt.value)}
            className={`inline-flex items-baseline gap-2 rounded-pill px-3.5 py-1.5 text-[13px] transition-colors ${
              active
                ? "bg-fg text-bg"
                : "text-fg-soft hover:bg-bg-sunk hover:text-fg"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
            <span className={`text-[11px] ${active ? "text-bg/70" : "text-muted"}`}>{opt.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

export function readPersistedAudience(): Audience {
  if (typeof window === "undefined") return "curious";
  try {
    const raw = window.localStorage.getItem("rr_audience");
    if (raw === "curious" || raw === "recruiter" || raw === "engineer") return raw;
  } catch {
    // ignore
  }
  return "curious";
}
```

The `readPersistedAudience` helper is exported so the shell can read it after mount (avoiding SSR hydration mismatch — see the Phase 1 `theme-toggle` precedent: read after mount, not at render).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run components/chat/audience-pills.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add components/chat/audience-pills.tsx components/chat/audience-pills.test.tsx
git commit -m "feat(chat): AudiencePills segmented control + persistence helper

Radio-group pill picker for curious | recruiter | engineer. Active pill
inverts (bg-fg text-bg) and shows the audience blurb inline. Selection
persists to localStorage[rr_audience]; readPersistedAudience() is the
SSR-safe read helper for the shell to call after mount."
```

---

## Task 5: Create `components/chat/suggestion-chips.tsx`

**Files:**
- Create: `components/chat/suggestion-chips.tsx`

Renders the chip rail for the current audience. Pure presentational — parent provides the per-audience list + the onPick handler.

- [ ] **Step 1: Create the file**

```tsx
"use client";

interface SuggestionChipsProps {
  prompts: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ prompts, onPick, disabled }: SuggestionChipsProps) {
  if (prompts.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        Try one of these
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="inline-flex items-center gap-2 rounded-pill border border-transparent bg-bg-sunk px-3.5 py-2 text-[13.5px] text-fg-soft transition-colors hover:border-border-strong hover:bg-bg-elev hover:text-fg disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/chat/suggestion-chips.tsx
git commit -m "feat(chat): SuggestionChips component (audience-keyed prompt rail)

Pure-presentational chip rail. Parent passes the per-audience prompts +
onPick. Visual unchanged from Phase 1 chip styling so the audience swap
feels like a content reflow, not a layout reflow."
```

---

## Task 6: Create `components/chat/chat-input.tsx` (hero-state input row)

**Files:**
- Create: `components/chat/chat-input.tsx`

The empty-state input row. Big `<textarea>` so multi-line questions don't truncate, Ask button on the right, Enter submits, Shift+Enter newline.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ onSubmit, disabled, placeholder, autoFocus }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSubmit(trimmed);
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={onFormSubmit} className="flex items-start gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Ask anything about Harshit's work…"}
        className="flex-1 resize-none rounded-[16px] border border-border bg-bg-elev px-5 py-[18px] text-[15.5px] leading-[1.5] text-fg placeholder:text-muted-2 transition-all focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex items-center gap-2.5 rounded-[16px] bg-fg px-6 py-[18px] text-[14.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
      >
        Ask
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/chat/chat-input.tsx
git commit -m "feat(chat): ChatInput component for the hero/empty-state row

Multiline textarea (rows=1, auto-fit via line-height), Enter submits,
Shift+Enter newline. Same visual as the Phase 1 input row — just extracted
so the orchestrator can compose it independently of the sticky followup."
```

---

## Task 7: Create `components/chat/turn.tsx`

**Files:**
- Create: `components/chat/turn.tsx`

One question + answer pair. The question bubble (right-aligned, sunken card) plus the streaming markdown answer. Shows a "…" placeholder while the answer is empty and `status === "streaming"`.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { MarkdownMessage } from "../markdown-message";
import type { Audience } from "@/lib/sse";

export interface TurnData {
  id: string;
  q: string;
  a: string;
  audience: Audience;
  chunkIds: string[];
  status: "streaming" | "done" | "error";
}

interface TurnProps {
  turn: TurnData;
}

export function Turn({ turn }: TurnProps) {
  return (
    <div className="space-y-5" data-turn-id={turn.id}>
      <div className="flex justify-end">
        <div
          className="max-w-[78%] whitespace-pre-wrap rounded-[20px_20px_6px_20px] border border-border bg-bg-sunk px-5 py-3 text-[15px] font-medium leading-[1.45] text-fg"
          data-audience={turn.audience}
        >
          {turn.q}
        </div>
      </div>
      <div>
        {turn.a ? (
          <MarkdownMessage content={turn.a} />
        ) : turn.status === "streaming" ? (
          <span className="text-muted" aria-live="polite">…</span>
        ) : null}
      </div>
    </div>
  );
}
```

The `data-audience` attribute on the question bubble is a hook for the audience-switch e2e test (Task 13) so it can assert that a Q2 sent under a different audience tags differently.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/chat/turn.tsx
git commit -m "feat(chat): Turn component (one Q+A pair)

Each Turn carries id, q, a, audience, chunkIds, status. The status drives
the empty-state placeholder ('…' while streaming, nothing once done or
errored). chunkIds is populated by the 'init' SSE event for Phase 3 to use."
```

---

## Task 8: Create `components/chat/sticky-followup.tsx`

**Files:**
- Create: `components/chat/sticky-followup.tsx`

Mid-thread input. Sticky on desktop (`position: sticky; bottom: 20px`), fixed bottom on mobile (`position: fixed; bottom: 0`). Z-index 5. Backdrop blur. Includes a Clear-thread button.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface StickyFollowupProps {
  onSubmit: (text: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function StickyFollowup({ onSubmit, onClear, disabled }: StickyFollowupProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSubmit(trimmed);
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      data-sticky-followup
      className="z-[5] mt-8 sm:sticky sm:bottom-5 fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto"
    >
      <div className="rounded-[16px] border border-border bg-bg-elev/85 px-3 py-3 shadow-md backdrop-blur-xl sm:px-3">
        <form onSubmit={onFormSubmit} className="flex items-start gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Ask a follow-up…"
            className="flex-1 resize-none rounded-[12px] border border-border bg-bg px-4 py-3 text-[14.5px] leading-[1.5] text-fg placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="inline-flex items-center gap-2 rounded-[12px] bg-fg px-4 py-3 text-[13.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
          >
            Ask
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear thread and start over"
            className="inline-flex items-center justify-center rounded-[12px] border border-border px-3 py-3 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
          >
            Clear
          </button>
        </form>
      </div>
    </div>
  );
}
```

The `data-sticky-followup` attribute is a hook for the e2e test in Task 13.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/chat/sticky-followup.tsx
git commit -m "feat(chat): StickyFollowup input + Clear button

Sticky on desktop (bottom: 20px), fixed on mobile. Backdrop blur, elevated
shadow, z-5 (above thread, below modal/toast). Includes a Clear button that
resets the thread back to empty state."
```

---

## Task 9: Rename + rewrite `citations-panel.tsx` → `components/chat/sources-rail.tsx`

**Files:**
- Rename + Modify: `components/citations-panel.tsx` → `components/chat/sources-rail.tsx`
- Modify: `components/chat-shell.tsx` (only the import path — full rewrite happens in Task 11; this step preserves the existing import temporarily)

History-preserving rename + visual rebuild: tag mapping by `metadata.tag` first, then by `sourceType`. Card body, mobile accordion, "Show excerpt" all preserved.

- [ ] **Step 1: Create the new directory if it doesn't exist + git-move the file**

Run:
```bash
mkdir -p components/chat
git mv components/citations-panel.tsx components/chat/sources-rail.tsx
```

- [ ] **Step 2: Rewrite the file in place**

Replace the entire content of `components/chat/sources-rail.tsx` with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ShikiCode } from "../shiki-code";
import { useCitations, type CitationCard } from "../citations-context";

// Tag mapping: an explicit chunk.metadata.tag wins (allows per-MDX override);
// otherwise we fall back to a stable mapping from sourceType.
const TAG_FROM_SOURCE_TYPE: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "production",
  experience: "experience",
  snippet: "snippet",
};

function tagFor(card: CitationCard): string {
  const meta = card.chunk.metadata?.tag;
  if (typeof meta === "string" && meta.length > 0) return meta;
  return TAG_FROM_SOURCE_TYPE[card.chunk.sourceType];
}

function SourceCard({ card }: { card: CitationCard }) {
  const { registerCard, activeCardN } = useCitations();
  const elRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const isActive = activeCardN === card.n;
  const lang = (card.chunk.metadata?.language as string) ?? undefined;

  useEffect(() => {
    registerCard(card.n, elRef.current);
    return () => registerCard(card.n, null);
  }, [card.n, registerCard]);

  useEffect(() => {
    if (isActive && !open) setOpen(true);
  }, [isActive, open]);

  return (
    <div
      ref={elRef}
      data-cite-n={card.n}
      data-active={isActive ? "true" : undefined}
      className={`rounded-[12px] border bg-bg-elev p-4 transition-all hover:border-border-strong ${
        isActive ? "border-accent ring-2 ring-accent/15 shadow-md" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded font-mono bg-accent-soft px-1.5 text-[10.5px] font-medium text-accent">
          {card.n}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
          {tagFor(card)}
        </span>
      </div>
      <div className="text-[13.5px] font-semibold leading-snug tracking-[-0.005em] text-fg">
        {card.chunk.title ?? card.chunk.filePath ?? "source"}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
        {card.chunk.sourceProject && <span>{card.chunk.sourceProject}</span>}
        {card.chunk.sourceProject && card.chunk.filePath && <span>·</span>}
        {card.chunk.filePath && <span className="truncate">{card.chunk.filePath}</span>}
        {card.chunk.sourceUrl && (
          <>
            <span>·</span>
            <a href={card.chunk.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              View on GitHub →
            </a>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`cite-body-${card.n}`}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg transition-colors"
      >
        <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <span>{open ? "Hide excerpt" : "Show excerpt"}</span>
      </button>
      {open && (
        <div id={`cite-body-${card.n}`} className="mt-2">
          <ShikiCode code={card.chunk.content} language={lang} />
        </div>
      )}
    </div>
  );
}

export function SourcesRail() {
  const { citations } = useCitations();

  const header = (
    <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
      Sources
    </h2>
  );

  const empty = (
    <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
  );

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside className="hidden md:block sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4" data-sources-rail>
        {header}
        <div className="space-y-3">
          {citations.length === 0 ? empty : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
      </aside>

      {/* Mobile: collapsed details accordion */}
      <details className="md:hidden mt-4 rounded-[12px] border border-border bg-bg-elev" data-sources-rail-mobile>
        <summary className="cursor-pointer list-none p-3 text-sm font-medium text-fg">
          <span className="mr-1.5 inline-block transition-transform [details[open]_&]:rotate-90" aria-hidden>▸</span>
          Sources ({citations.length})
        </summary>
        <div className="space-y-3 p-3 pt-0">
          {citations.length === 0 ? empty : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
      </details>
    </>
  );
}

// Re-export the type so existing imports still work during the migration
export type { CitationCard } from "../citations-context";
```

Changes from the old `CitationsPanel`:
- Component name renamed `CitationsPanel` → `SourcesRail`
- Source-card internal component renamed `CitationCardView` → `SourceCard`
- Tag-derivation logic moved out into `tagFor()` so `metadata.tag` can override
- Color-coded badges removed; tag is now a single muted-mono uppercase string (the design wants consistency, not a rainbow)
- `data-sources-rail` / `data-sources-rail-mobile` attributes for e2e
- `import { ShikiCode } from "../shiki-code"` (one directory up from `components/chat/`)
- Sources header switched to mono + uppercase tracking (matches the section-label rhythm)

- [ ] **Step 3: Temporarily update `components/chat-shell.tsx` to import the new path**

In `components/chat-shell.tsx`, find:
```tsx
import { CitationsPanel } from "./citations-panel";
```
Replace with:
```tsx
import { SourcesRail } from "./chat/sources-rail";
```

And find the JSX usage:
```tsx
      <CitationsPanel />
```
Replace with:
```tsx
      <SourcesRail />
```

(The full chat-shell rewrite is Task 11. This step keeps the codebase compilable + visually working between commits.)

- [ ] **Step 4: Run typecheck + tests + e2e**

Run: `pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: PASS — the e2e `recruiter-flow.spec.ts` still finds "Show excerpt" buttons because the SourceCard still renders that exact label. `markdown-render.spec.ts` doesn't care about the rail.

- [ ] **Step 5: Manual visual check**

Run: `pnpm dev`
1. Send a question; verify source cards still render
2. Each card now has the tag in the top-right (mono uppercase) instead of a colored badge
3. The badge with the citation number sits on the top-left as before
4. Mobile: shrink viewport — accordion still works
5. Click a `[1]` marker in the answer — the corresponding card highlights with accent ring

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(chat): rename CitationsPanel → SourcesRail with metadata.tag override

git mv preserves the file's history. SourcesRail differs from the old panel
in three ways: (1) a metadata.tag on the chunk overrides the sourceType-
derived tag (per-MDX control), (2) the color-coded badge per sourceType is
gone — replaced by a single muted mono tag string, and (3) data-* attrs
added for the new source-card e2e in Task 13.

chat-shell.tsx still wires the old monolithic UI for now — full rebuild
lands in Task 11."
```

---

## Task 10: Create `components/hero.tsx`

**Files:**
- Create: `components/hero.tsx`

Hero block lifted out of `app/page.tsx`. Hosts the eyebrow, headline, lede, and the `<AudiencePills>` row. Accepts `audience` + `onAudienceChange` so the shell stays the source of truth.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { AudiencePills } from "./chat/audience-pills";
import type { Audience } from "@/lib/sse";

interface HeroProps {
  subheadline: string;
  audience: Audience;
  onAudienceChange: (next: Audience) => void;
}

export function Hero({ subheadline, audience, onAudienceChange }: HeroProps) {
  return (
    <header className="max-w-3xl space-y-7">
      {/* NOTE: eyebrow copy is the design-mock placeholder; user confirms/rewrites in Phase 5b content authoring. */}
      <div className="inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
        <span
          aria-hidden
          className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent ring-4 ring-accent-soft animate-[pulse-dot_2.6s_ease-in-out_infinite]"
        />
        Open to senior/mid full-stack roles · Delhi / Remote
      </div>
      <h1 className="font-serif text-[clamp(48px,8vw,96px)] font-medium leading-[0.94] tracking-[-0.03em] text-fg">
        Ask my work <em className="font-medium italic text-accent">anything</em>.
      </h1>
      <p className="max-w-[580px] text-[17px] leading-[1.6] text-muted">{subheadline}</p>
      <div className="pt-2">
        <AudiencePills audience={audience} onChange={onAudienceChange} />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/hero.tsx
git commit -m "feat(hero): extract Hero component with embedded AudiencePills

Hero now hosts the eyebrow, headline, lede, and the audience pill row. The
pill row needs client-side hydration (localStorage) and ChatShell owns the
audience state — so Hero gets the value via props and forwards changes
back. app/page.tsx still renders the old hero JSX inline for one more commit
until Task 11 wires the new composition."
```

---

## Task 11: Rewrite `components/chat-shell.tsx` as orchestrator + update `app/page.tsx`

**Files:**
- Modify: `components/chat-shell.tsx` (wholesale rewrite)
- Modify: `app/page.tsx` (mount the new composition)

The new orchestrator owns `turns: Turn[]` + `audience: Audience` + `busy: boolean` + `statusBanner: string | null`. It composes Hero, SuggestionChips (empty state), Thread of Turns (mid-state), and StickyFollowup. The SSE handler routes events to the right slot.

- [ ] **Step 1: Rewrite `components/chat-shell.tsx`**

Overwrite the entire file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CitationsProvider, useCitations } from "./citations-context";
import { Hero } from "./hero";
import { SourcesRail } from "./chat/sources-rail";
import { SuggestionChips } from "./chat/suggestion-chips";
import { ChatInput } from "./chat/chat-input";
import { StickyFollowup } from "./chat/sticky-followup";
import { Turn, type TurnData } from "./chat/turn";
import { readPersistedAudience } from "./chat/audience-pills";
import type { Audience } from "@/lib/sse";

export interface SuggestionChipsByAudience {
  curious: string[];
  recruiter: string[];
  engineer: string[];
}

interface ChatShellProps {
  subheadline: string;
  suggestionChips: SuggestionChipsByAudience;
}

function Body({ subheadline, suggestionChips }: ChatShellProps) {
  const [audience, setAudience] = useState<Audience>("curious");
  const [turns, setTurns] = useState<TurnData[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { addCitation, clearCitations } = useCitations();

  // Read persisted audience after mount (SSR-safe — see theme-toggle precedent)
  useEffect(() => {
    setAudience(readPersistedAudience());
  }, []);

  function patchLastTurn(patch: (t: TurnData) => TurnData) {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const copy = prev.slice();
      copy[copy.length - 1] = patch(copy[copy.length - 1]);
      return copy;
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setStatusBanner(null);
    clearCitations();

    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newTurn: TurnData = {
      id,
      q: text,
      a: "",
      audience,
      chunkIds: [],
      status: "streaming",
    };
    const nextTurns = [...turns, newTurn];
    setTurns(nextTurns);

    // Build the wire-format history from completed turns + the new question.
    // Streaming turns include their empty `a` so the model sees the in-progress
    // assistant slot if we ever support stop+resume; today the in-progress turn
    // is the LAST turn so the history we send ends with the new user message.
    const history = nextTurns.flatMap((t) =>
      t === newTurn
        ? [{ role: "user" as const, content: t.q }]
        : [
            { role: "user" as const, content: t.q },
            { role: "assistant" as const, content: t.a },
          ]
    );

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, audience }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        setStatusBanner("Failed to reach the server.");
        patchLastTurn((t) => ({ ...t, status: "error" }));
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          if (!evt.startsWith("data: ")) continue;
          const ev = JSON.parse(evt.slice(6));
          if (ev.type === "init") {
            patchLastTurn((t) => ({ ...t, id: ev.messageId, chunkIds: ev.chunkIds }));
          } else if (ev.type === "token") {
            patchLastTurn((t) => ({ ...t, a: t.a + ev.text }));
          } else if (ev.type === "citation") {
            addCitation({ n: ev.n, chunk: ev.chunk });
          } else if (ev.type === "rate_limited") {
            setStatusBanner(`Slow down — try again in ${ev.retryAfterSeconds}s.`);
          } else if (ev.type === "spend_capped") {
            setStatusBanner(ev.message);
          } else if (ev.type === "error") {
            setStatusBanner(ev.message);
            patchLastTurn((t) => ({ ...t, status: "error" }));
          } else if (ev.type === "done") {
            patchLastTurn((t) => (t.status === "streaming" ? { ...t, status: "done" } : t));
          }
        }
      }
      // If the stream closed without emitting "done" (server abort, etc.) make
      // sure the last turn is no longer marked "streaming" so the "…" placeholder
      // doesn't get stuck.
      patchLastTurn((t) => (t.status === "streaming" ? { ...t, status: "done" } : t));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStatusBanner("Connection lost.");
        patchLastTurn((t) => ({ ...t, status: "error" }));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function clearThread() {
    abortRef.current?.abort();
    setTurns([]);
    clearCitations();
    setStatusBanner(null);
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  const promptsForAudience = suggestionChips[audience] ?? [];
  const empty = turns.length === 0;

  return (
    <div className="space-y-10">
      <Hero
        subheadline={subheadline}
        audience={audience}
        onAudienceChange={setAudience}
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <div>
          {empty ? (
            <div className="space-y-6">
              <SuggestionChips prompts={promptsForAudience} onPick={send} disabled={busy} />
              <ChatInput onSubmit={send} disabled={busy} autoFocus />
            </div>
          ) : (
            <div className="space-y-8">
              {turns.map((t) => (
                <Turn key={t.id} turn={t} />
              ))}
            </div>
          )}

          {statusBanner && (
            <div className="mt-4 flex items-center justify-between rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                aria-label="Dismiss"
                className="ml-3 text-amber-900/60 hover:text-amber-900 dark:text-amber-200/60 dark:hover:text-amber-200"
              >
                ×
              </button>
            </div>
          )}

          {!empty && (
            <StickyFollowup onSubmit={send} onClear={clearThread} disabled={busy} />
          )}
        </div>
        <SourcesRail />
      </div>
    </div>
  );
}

export function ChatShell(props: ChatShellProps) {
  return (
    <CitationsProvider>
      <Body {...props} />
    </CitationsProvider>
  );
}
```

Key design notes:
- `audience` initial value is `"curious"` so SSR + first hydration paint match the no-localStorage default; the `useEffect` then reads `localStorage` after mount.
- The Turn id is initially a client-side UUID and later replaced when the `init` SSE event arrives with the server's `messageId`. This means React's `key={t.id}` would remount Turn on init — to avoid that, we keep the client-side id stable and overwrite it only when the assistant slot is empty (Phase 2 makes do; Phase 3 may want a stable separate `messageId` field, but that's out of scope here). The remount during the very first delta is acceptable cost — text is still empty at that point.
- `clearThread` aborts any in-flight request before resetting state.
- The "done" event sets the turn from `"streaming"` → `"done"`. Errors mark it `"error"` and `Turn` hides the "…" placeholder once status is non-streaming.

- [ ] **Step 2: Update `app/page.tsx` to load the new chip shape and mount the new ChatShell**

Overwrite the entire `app/page.tsx` with:

```tsx
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell, type SuggestionChipsByAudience } from "@/components/chat-shell";

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            Email
          </a>
          <a
            href="https://www.linkedin.com/in/harshit-sindhu/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
            LinkedIn
          </a>
          <a
            href="https://github.com/HArshit123455"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 0 0-.9-2.1c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.8 0 0-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.1 1.6 4 2 4 2c-.8 2-.3 3.5-.1 3.8A5.1 5.1 0 0 0 2.5 9.3c0 5 3.1 6.3 6 6.6-.4.4-.7.9-.8 1.5L8 22"/></svg>
            GitHub
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
    </main>
  );
}
```

The footer stays inline (Phase 4 will extract it; Phase 2 leaves it alone). The Hero is now rendered inside `ChatShell`, so the inline hero markup is removed from `app/page.tsx`.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — `LandingFront.suggestionChips` is now `SuggestionChipsByAudience` and the cast in `loadLanding` is intentional (the MDX frontmatter shape matches).

- [ ] **Step 4: Run unit tests**

Run: `pnpm test`
Expected: PASS — no existing test imports the old `demoPrompts` shape directly; `audience-pills.test.tsx` (Task 4) and the other component tests still pass independently.

- [ ] **Step 5: Run existing e2e against the new shell**

Run: `pnpm test:e2e e2e/recruiter-flow.spec.ts`

The spec clicks the first chip matching `/Have you built/`. The new `content/landing.mdx` has NO chip matching `/Have you built/` exactly — the recruiter audience has "Have you owned a feature end-to-end in production?" which doesn't match.

Update `e2e/recruiter-flow.spec.ts` to:
1. Switch to the recruiter audience first (the test is called "recruiter-flow" after all)
2. Click the recruiter chip "Have you owned a feature end-to-end in production?"

Replace the contents of `e2e/recruiter-flow.spec.ts` with:

```ts
import { test, expect } from "@playwright/test";

test("recruiter can ask a question and see a streamed answer with citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  // Switch to the recruiter audience
  await page.getByRole("radio", { name: /recruiter/i }).click();

  // Click the first recruiter chip
  const firstPrompt = page
    .locator("button")
    .filter({ hasText: /Have you owned a feature/ })
    .first();
  await firstPrompt.click();

  // Assistant answer renders inside <article aria-label="Assistant answer">
  const assistantArticle = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(assistantArticle).toBeVisible({ timeout: 8000 });
  await expect(assistantArticle).not.toHaveText("", { timeout: 30000 });

  // Citations panel surfaces "Show excerpt" buttons; toggle the first
  const showExcerptButtons = page.locator('button:has-text("Show excerpt")');
  await expect(showExcerptButtons.first()).toBeVisible({ timeout: 30000 });
  await showExcerptButtons.first().click();

  // After expanding, a Shiki code region appears
  await expect(page.locator('[role="region"][aria-label*="Code excerpt"]').first()).toBeVisible();
});
```

- [ ] **Step 6: Run both e2e specs**

Run: `pnpm test:e2e`
Expected: PASS — `markdown-render.spec.ts` still works (it never depended on chip content). `recruiter-flow.spec.ts` now exercises the audience-switch + new chip set.

- [ ] **Step 7: Manual dev-server full UX smoke**

Run: `pnpm dev`
Verify in this order:
1. **Empty state, light mode**: Hero shows pulsing dot + headline + lede + audience pills (Curious active by default). Chips below match the Curious set. Input row below.
2. **Switch audience to Recruiter**: chips swap to the Recruiter set. Click "Recruiter" pill — inversion to bg-fg / text-bg.
3. **Switch to Engineer**: chips swap again. Refresh the page — Engineer stays selected (localStorage).
4. **Reset to Curious**: click pill. Hard-refresh — Curious sticks.
5. **Ask a question**: streaming answer appears as a Turn, source rail populates. Sticky followup pops up below.
6. **Type into the sticky followup, ask Q2**: previous turn stays, new turn appends, sources reset to Q2's citations.
7. **Scroll the page**: sticky followup stays at `bottom: 20px` on desktop. Shrink to mobile width — it becomes fixed-bottom.
8. **Click Clear**: thread empties, back to chip rail, sources rail clears.
9. **Toggle dark theme**: everything stays legible.
10. **Manually set `data-mode="love"` in console**: accent shifts to rose pink everywhere (eyebrow, anything-em, active-pill bg, chip border on hover, source-card accent).

- [ ] **Step 8: Commit**

```bash
git add components/chat-shell.tsx app/page.tsx e2e/recruiter-flow.spec.ts content/landing.mdx
git commit -m "feat(chat): rebuild ChatShell as Turn-based orchestrator with audience steering

Wholesale rewrite. ChatShell now owns audience + turns[] + busy + status
state. Composition:
  Hero (eyebrow + headline + AudiencePills)
  empty   → SuggestionChips (audience-keyed) + ChatInput
  filled  → Thread of <Turn/> + StickyFollowup
  SourcesRail in the right column.

SSE init event populates Turn.chunkIds + Turn.id (server messageId) for
Phase 3 to consume. Audience persists to localStorage[rr_audience]; SSR-safe
read after mount.

content/landing.mdx restructured: demoPrompts → suggestionChips per audience.
recruiter-flow e2e updated to switch audience first."
```

---

## Task 12: Delete the legacy CSS alias layer

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.cjs`

Once Tasks 1 + 9 + 11 have removed every legacy class consumer, the alias layer is dead weight. Drop it. If anything still uses the aliases, the build will fail loudly here — and that's the safety net.

- [ ] **Step 1: Verify no source file still references a legacy alias**

Run:
```bash
git grep -nE "(text-text|text-text-soft|bg-surface|bg-code-bg|bg-accent-bg|bg-highlight|text-surface|bg-text|shadow-token|\\bhighlight\\b)" -- "components/**" "app/**" ":!app/globals.css"
```
Expected: NO matches. (If anything turns up, fix it before continuing.)

Note: `\bhighlight\b` matches the Tailwind utility `text-highlight`/`bg-highlight`/`border-highlight`. Inside `app/globals.css` and in comments we can ignore.

- [ ] **Step 2: Remove the legacy var aliases from `app/globals.css`**

Find and delete the legacy-alias block in the `:root, html[data-theme="light"]` block (currently lines 21–28):

```css
  /* Legacy aliases (delete after Phase 2 migration) */
  --surface: var(--bg-elev);
  --text: var(--fg);
  --text-soft: var(--fg-soft);
  --code-bg: var(--bg-sunk);
  --accent-bg: var(--accent-soft);
  --highlight: var(--accent-soft);

```

Also delete the same block inside `html[data-theme="dark"]` (currently lines 54–60):

```css
  --surface: var(--bg-elev);
  --text: var(--fg);
  --text-soft: var(--fg-soft);
  --code-bg: var(--bg-sunk);
  --accent-bg: var(--accent-soft);
  --highlight: var(--accent-soft);

```

Also delete the `--shadow` legacy alias near the bottom of the `:root` block (currently line 35):

```css
  --shadow: var(--shadow-sm); /* legacy alias */
```

(Inside the dark block, line 67 is `--shadow: var(--shadow-sm);` — delete that too.)

- [ ] **Step 3: Remove the legacy color entries + the `shadow.token` entry from `tailwind.config.cjs`**

In `tailwind.config.cjs`, find the legacy aliases block:

```js
        // Legacy aliases (remove in Phase 2)
        surface: "var(--surface)",
        text: "var(--text)",
        "text-soft": "var(--text-soft)",
        "accent-bg": "var(--accent-bg)",
        "code-bg": "var(--code-bg)",
        highlight: "var(--highlight)",
```

Delete those six lines (and the `// Legacy aliases` comment).

In the `boxShadow` block, find:
```js
      boxShadow: {
        token: "var(--shadow)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
```

Delete the `token:` line:
```js
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
```

- [ ] **Step 4: Run a full build**

Run: `pnpm build`
Expected: PASS — Next.js + Tailwind compile cleanly. Any stray legacy-class reference would produce a missing-class warning here.

- [ ] **Step 5: Run typecheck + tests + e2e**

Run: `pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: PASS on all three.

- [ ] **Step 6: Manual visual sanity-check**

Run: `pnpm dev`
1. Hero, chat, source rail, citation markers, footer all render correctly in both themes
2. Hover states (citation marker, source card, sticky followup Clear) still work
3. Code blocks (Shiki) still have the warm sunken background
4. Tooltip on `[1]` markers still inverts ink-on-paper

- [ ] **Step 7: Commit**

```bash
git add app/globals.css tailwind.config.cjs
git commit -m "chore(theme): delete Phase 1 legacy alias layer

--surface, --text, --text-soft, --code-bg, --accent-bg, --highlight (CSS
vars) and surface/text/text-soft/accent-bg/code-bg/highlight (Tailwind
colors) all removed. shadow-token utility removed too. Every component now
uses canonical tokens directly.

Phase 1 shipped these as a migration crutch so the editorial restyle could
land without rewriting every consumer in one commit. Phase 2 finished
porting them — this is the cleanup."
```

---

## Task 13: Add Phase 2 e2e specs

**Files:**
- Create: `e2e/audience-switch.spec.ts`
- Create: `e2e/sticky-followup.spec.ts`
- Create: `e2e/source-card.spec.ts`

Spec asks for three new specs. Keep each focused — they cover behavior that already works after Task 11 but isn't yet asserted.

- [ ] **Step 1: Create `e2e/audience-switch.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("audience pill persists to localStorage and changes the visible chip set", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  // Curious is the default — verify a curious chip is visible
  await expect(page.locator("button").filter({ hasText: /What kind of work do you actually do/ })).toBeVisible();

  // Click Engineer
  await page.getByRole("radio", { name: /engineer/i }).click();
  await expect(page.getByRole("radio", { name: /engineer/i })).toHaveAttribute("aria-checked", "true");

  // Engineer chip should now be visible; the curious one should not
  await expect(page.locator("button").filter({ hasText: /Show me how you built production rate limiting/ })).toBeVisible();
  await expect(page.locator("button").filter({ hasText: /What kind of work do you actually do/ })).toHaveCount(0);

  // Reload — Engineer must persist
  await page.reload();
  await expect(page.getByRole("radio", { name: /engineer/i })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("button").filter({ hasText: /Show me how you built production rate limiting/ })).toBeVisible();
});
```

- [ ] **Step 2: Create `e2e/sticky-followup.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("sticky followup appears after first turn and stays visible on scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  // No follow-up before the first question
  await expect(page.locator("[data-sticky-followup]")).toHaveCount(0);

  // Ask a curious question
  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Wait for the streaming answer to start
  const assistantArticle = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(assistantArticle).toBeVisible({ timeout: 8000 });
  await expect(assistantArticle).not.toHaveText("", { timeout: 30000 });

  // Sticky followup is mounted
  const followup = page.locator("[data-sticky-followup]");
  await expect(followup).toBeVisible();
  await expect(followup.getByPlaceholder(/Ask a follow-up/)).toBeVisible();

  // Scroll the page; followup must remain visible at the bottom of the viewport
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
  await expect(followup).toBeInViewport();
});
```

- [ ] **Step 3: Create `e2e/source-card.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("source card excerpts expand and collapse", async ({ page }) => {
  await page.goto("/");

  // Ask anything that will produce citations
  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Wait for the desktop rail to show at least one Show-excerpt button
  const showButtons = page.locator('[data-sources-rail] button:has-text("Show excerpt")');
  await expect(showButtons.first()).toBeVisible({ timeout: 30000 });

  // Expand the first card
  const firstShow = showButtons.first();
  await firstShow.click();
  await expect(page.locator('[role="region"][aria-label*="Code excerpt"]').first()).toBeVisible();
  // Button now reads "Hide excerpt"
  await expect(page.locator('[data-sources-rail] button:has-text("Hide excerpt")').first()).toBeVisible();

  // Collapse it again
  await page.locator('[data-sources-rail] button:has-text("Hide excerpt")').first().click();
  await expect(page.locator('[data-sources-rail] button:has-text("Show excerpt")').first()).toBeVisible();
});

test("mobile sources rail collapses into a details accordion", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "viewport behavior is browser-agnostic; run once");
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");

  await page.locator("button").filter({ hasText: /What kind of work do you actually do/ }).first().click();

  // Mobile rail is a <details> element
  const mobileRail = page.locator("[data-sources-rail-mobile]");
  await expect(mobileRail).toBeVisible();
  // It starts collapsed
  await expect(mobileRail).not.toHaveAttribute("open", "");
  // Click the summary to open it
  await mobileRail.locator("summary").click();
  await expect(mobileRail).toHaveAttribute("open", "");
});
```

- [ ] **Step 4: Run all e2e specs**

Run: `pnpm test:e2e`
Expected: PASS — all five specs green (`recruiter-flow`, `markdown-render`, `audience-switch`, `sticky-followup`, `source-card`).

If `recruiter-flow.spec.ts` was already passing after Task 11, no regression here. If `source-card.spec.ts` flakes on the mobile-accordion assertion because Chromium doesn't always serialize the `open` attribute as empty string, fall back to:
```ts
expect(await mobileRail.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
```

- [ ] **Step 5: Commit**

```bash
git add e2e/audience-switch.spec.ts e2e/sticky-followup.spec.ts e2e/source-card.spec.ts
git commit -m "test(e2e): add audience-switch, sticky-followup, source-card specs

Three new Phase 2 e2e specs:
- audience-switch: pill click swaps chip set; reload persists
- sticky-followup: appears after first turn, stays in viewport on scroll
- source-card: excerpt expand/collapse + mobile accordion

All five specs (with recruiter-flow + markdown-render) run on the chromium
project; viewport-specific mobile assertion is chromium-only."
```

---

## Task 14: Final verification + ship

**Files:** none — verification only.

- [ ] **Step 1: Full pre-ship gate**

Run, in order, expecting each to pass:
```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

If any step fails, fix the root cause before continuing. Do not advance to the next step without a green run.

- [ ] **Step 2: Manual feature walkthrough**

Run: `pnpm dev`

Walk through every Phase 2 spec requirement:

| Spec requirement | How to verify |
|---|---|
| Audience pill control | Click each pill, observe chip swap + active state |
| Audience persists | Reload page, last-selected pill stays active |
| Audience reaches backend | Open Network → /api/chat → request body includes `"audience": "..."` |
| VOICE_INSTRUCTIONS steers answer | Ask the same question on Recruiter then on Engineer — Recruiter answer leads with outcomes; Engineer answer mentions files |
| Turn-based thread | Q1 + answer + Q2 + answer — both turns render with question bubbles |
| Sticky follow-up appears after first turn | Confirmed in Task 13 + manual scroll |
| Clear button resets thread | Click Clear in sticky footer — chip rail returns |
| `init` event populates chunkIds | DevTools → SSE stream → see `data: {"type":"init","messageId":"...","chunkIds":[...]}` event ahead of citations |
| SourcesRail tag | Each card shows the tag in the top-right (production/experience/snippet) |
| Mobile sources accordion | Shrink to ≤ 640px — sources collapses to `<details>` |
| Love-mode override still works | DevTools → `document.documentElement.setAttribute("data-mode","love")` → accent shifts to rose pink everywhere |
| Dark theme intact | Toggle theme — every surface stays legible |
| `prefers-reduced-motion` | DevTools → Rendering → reduce-motion → hero dot stops pulsing, sticky-followup transitions instant |

- [ ] **Step 3: Confirm no console errors**

Open the dev server, complete a full Q1 + Q2 flow on each audience. Browser DevTools console must stay clean (no React hydration warnings, no fetch errors, no unhandled promise rejections).

- [ ] **Step 4: No final-commit step required**

Every Task above committed its own work. The Phase 2 set is the run of commits from Task 1 onward. Verify with:
```bash
git log --oneline 4ed902e..HEAD
```
You should see ~14 commits, one per major Task plus the e2e/spec rename inside Task 11.

---

## Verification Checklist (run before declaring Phase 2 done)

- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm test` → all suites PASS (including new `audience-pills.test.tsx`)
- [ ] `pnpm test:e2e` → all 5 specs PASS
- [ ] `pnpm build` → builds cleanly
- [ ] Manual smoke: audience switch, chip swap, persistence across reload, multi-turn thread, sticky followup on scroll, clear button, mobile sources accordion, love-mode DevTools override, dark mode
- [ ] Network panel shows `audience` in request body and an `init` SSE event ahead of citations
- [ ] `git grep -nE "(text-text|text-text-soft|bg-surface|bg-code-bg|bg-accent-bg|bg-highlight|text-surface|bg-text|shadow-token)" -- "components/**" "app/**"` returns nothing
- [ ] No FOUC, no hydration warnings, no console errors
