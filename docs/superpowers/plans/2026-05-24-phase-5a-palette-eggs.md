# Phase 5a — Cmd-K Palette + Easter Eggs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the interaction layer that turns the editorial portfolio into a navigable command surface. Three primitives ship together: (1) a **Cmd-K command palette** (focus-trapped dialog, 5 sections, search filter with hidden-on-match) that opens via Cmd/Ctrl-K, the header hint pill, or the footer accent text; (2) an **inline command system** in the chat input that intercepts `sudo`, `whoami`, and the LOVE_TRIGGERS word list before the request leaves the client; (3) three **lazy-loaded easter-egg overlays** (Konami sparkle, Love hearts + 7s pink accent shift via `html[data-mode="love"]`, Matrix katakana rain). All overlays load only on first trigger via `next/dynamic({ ssr: false })`, so they add zero bytes to the initial bundle. Toast component renders all hints with `aria-live="polite"`. `prefers-reduced-motion` reduces every overlay to toast-only.

**Architecture:** Five layers move together — (1) **pure detectors** (`components/eggs/use-love-triggers.ts` for word-boundary regex match against LOVE_TRIGGERS, `components/eggs/inline-commands.ts` for sudo/whoami/love dispatch) live as plain functions so they're trivially unit-testable; (2) **Toast** is a queue-of-one provider with a single `aria-live="polite"` region and a 3.2s default timer; (3) **Palette** is a focus-trapped dialog with arrow-key navigation, Esc-to-close, fuzzy search filter, and 5 sections — Hidden commands only render when the search query matches one of their keywords; (4) **Overlays** (`love-overlay`, `sparkle-overlay`, `matrix-overlay`) are isolated client components that paint full-viewport effects for their duration and clean up after themselves — the Love overlay also toggles `html[data-mode="love"]` for its 7s window so the existing CSS `--accent` shift takes effect across the whole site; (5) **Chrome** (`components/chrome.tsx`) is the single client wrapper mounted in `app/layout.tsx` that hosts all three providers (Toast, Palette, Eggs), registers the global Cmd-K listener and the Konami keydown listener (which checks `document.activeElement` and bails when an input/textarea is focused), and lazy-loads each overlay via `next/dynamic({ ssr: false })` so they only ship to the client after first trigger.

**Tech Stack:** Next.js 15 App Router client components inside a single `<Chrome>` client wrapper mounted in `app/layout.tsx`. `next/dynamic({ ssr: false })` for the three overlays. Native CSS keyframes + Canvas2D (for Matrix) + inline SVG hearts (for Love) — no animation libraries. Existing tokens (`bg-bg-elev` / `text-fg-soft` / `border-border` / `text-accent`) re-used everywhere. Vitest with `@testing-library/react` + jsdom for component tests (existing pattern from `components/theme-toggle.test.tsx`, `components/chat/audience-pills.test.tsx`). Playwright for e2e (existing pattern from `e2e/sticky-followup.spec.ts`). Zero new dependencies.

**Phase 4 primitives reused (don't rebuild):**
- `app/globals.css` already declares `html[data-mode="love"]` and the `prefers-reduced-motion` killswitch (Phase 1 set both up).
- `<Footer/>` already renders `<span className="text-accent">press ⌘K</span>` — Phase 5a wires it to a click handler that opens the palette.
- `<ProjectsSection/>` carries `id="work"` and `<NowStrip/>` carries `id="now"` — palette "Jump to Work / Jump to Now" entries scroll to those anchors. Phase 5a adds `id="footer"` to `<Footer/>` for the "Jump to Footer" entry.
- `<Header/>` exists but has no Cmd-K hint pill yet (despite what an earlier note said). Phase 5a adds it.
- `<ChatInput/>` and `<StickyFollowup/>` both wrap a textarea and submit on Enter — `useInlineCommands` wraps the existing `onSubmit` prop in `<ChatInput/>` so easter-egg triggers fire on submit before the request goes out.
- `lib/sse.ts` exports the `Audience` union — palette's Audience section reuses it.

---

## File Structure

**Create:**
- `components/toast.tsx` — `ToastProvider`, `useToast()`, `<Toast/>` element with `aria-live="polite"`, 3.2s default duration, queue-of-one (newer wins).
- `components/palette/commands.ts` — typed command catalog: `Command = { id, label, kbd?, section, keywords?, hidden?, handler }`. Five sections in display order: Navigate, Audience, Connect, Settings, Hidden.
- `components/palette/command-list.tsx` — section/item renderer + arrow-key navigation + Enter to fire.
- `components/palette/command-palette.tsx` — focus-trapped dialog (`role="dialog"`, `aria-modal="true"`), search input, Esc-to-close, returns focus to trigger on close.
- `components/palette/command-palette.test.tsx` — keyboard navigation, Esc, search filters, hidden commands only on match.
- `components/eggs/use-love-triggers.ts` — exports `LOVE_TRIGGERS`, `LOVE_MESSAGES`, and `detectLoveTrigger(text): { trigger, message } | null`. Word-boundary regex, case-insensitive. "lover" does not match "love".
- `components/eggs/use-love-triggers.test.ts` — word boundaries, case-insensitive, emoji trigger, "lover" doesn't match.
- `components/eggs/inline-commands.ts` — exports `detectInlineCommand(text): { kind: "sudo" | "whoami" | "love"; ... } | null`. Composes `detectLoveTrigger` for the love path. Pure function.
- `components/eggs/inline-commands.test.ts` — sudo prefix, whoami exact match, love trigger composition.
- `components/eggs/use-inline-commands.ts` — React hook: `useInlineCommands(onSubmit)` returns a wrapped submit that runs `detectInlineCommand`, fires toast/overlay on match (swallows the submit), forwards otherwise.
- `components/eggs/use-konami.ts` — `useKonami(onComplete)` registers a window keydown listener; bails when `document.activeElement` is an INPUT/TEXTAREA; tracks sequence `↑↑↓↓←→←→ B A`.
- `components/eggs/use-logo-click-counter.ts` — `useLogoClickCounter()` returns `{ count, increment }`; increment fires toast at 5/10/15. Counter is a ref+state pair (no localStorage; resets on reload).
- `components/eggs/brand-wordmark.tsx` — client wrapper around the brand link that wires `useLogoClickCounter()` to the click handler (extracted from `components/header.tsx`).
- `components/eggs/love-overlay.tsx` — full-viewport SVG hearts overlay + rose vignette; mounts for 7s; toggles `html[data-mode="love"]` for its window; under `prefers-reduced-motion`, mounts as toast-only (parent decides).
- `components/eggs/sparkle-overlay.tsx` — 3.2s sparkle burst (8–10 inline SVG stars with CSS keyframe scale/fade).
- `components/eggs/matrix-overlay.tsx` — 8s Canvas2D katakana rain in `var(--accent)`; sizes to viewport; cleans up rAF on unmount.
- `components/palette/cmd-k-pill.tsx` — client `<button>` that renders the mono "⌘K" pill in the header and calls `openPalette()` on click.
- `components/chrome.tsx` — single client component that mounts `ToastProvider`, `PaletteProvider`, `EggsProvider`; registers the global Cmd/Ctrl-K listener and the Konami listener; lazy-loads the three overlays via `next/dynamic({ ssr: false })`; renders `{children}`.
- `components/chrome-context.ts` — `usePalette()`, `useToast()`, `useEggs()` hook exports + context types (kept separate from `chrome.tsx` so the API surface is import-safe).
- `public/resume.pdf` — minimal valid PDF placeholder (real PDF in Phase 5b).
- `e2e/palette.spec.ts` — Cmd-K opens the palette, all 4 default sections render, Esc closes.
- `e2e/konami.spec.ts` — typing the sequence triggers sparkle overlay (asserts overlay DOM appears).
- `e2e/love-mode.spec.ts` — typing "mumma" in chat input triggers love overlay + `html[data-mode="love"]` flip + toast.

**Modify:**
- `app/layout.tsx` — wrap `<Header />` + `<div>{children}</div>` in `<Chrome>`.
- `components/header.tsx` — replace the static brand `<Link>` with `<BrandWordmark/>`; insert `<CmdKPill/>` in the right-side icon row before `<ThemeToggle/>`.
- `components/footer.tsx` — replace the static `<span className="text-accent">press ⌘K</span>` with a `<button>` (or click-only span) that calls `usePalette().open()`; add `id="footer"` to the `<footer>` element.
- `components/chat/chat-input.tsx` — call `useInlineCommands(onSubmit)` and use the wrapped submitter inside `submit()`.

**No rename / no delete.**

---

## Task 1: Pure detectors — `use-love-triggers.ts` + `inline-commands.ts` + tests

**Files:**
- Create: `components/eggs/use-love-triggers.ts`
- Create: `components/eggs/use-love-triggers.test.ts`
- Create: `components/eggs/inline-commands.ts`
- Create: `components/eggs/inline-commands.test.ts`

These are pure functions — no React, no DOM. Detection lives here so wiring code stays trivial. `LOVE_TRIGGERS` and `LOVE_MESSAGES` are the spec-listed constants verbatim.

- [ ] **Step 1: Write failing tests for `use-love-triggers`**

```ts
// components/eggs/use-love-triggers.test.ts
import { describe, it, expect } from "vitest";
import { detectLoveTrigger, LOVE_TRIGGERS, LOVE_MESSAGES } from "./use-love-triggers";

describe("detectLoveTrigger", () => {
  it("matches a trigger as a whole word", () => {
    expect(detectLoveTrigger("hi mumma")?.trigger).toBe("mumma");
    expect(detectLoveTrigger("mumma is here")?.trigger).toBe("mumma");
    expect(detectLoveTrigger("MUMMA")?.trigger).toBe("mumma");
  });

  it("does not match a trigger inside another word", () => {
    // "lover" must not match "love"
    expect(detectLoveTrigger("lover")).toBeNull();
    expect(detectLoveTrigger("hovercraft")).toBeNull();
  });

  it("matches around punctuation", () => {
    expect(detectLoveTrigger("love.")?.trigger).toBe("love");
    expect(detectLoveTrigger("hey, love!")?.trigger).toBe("love");
    expect(detectLoveTrigger("love?")?.trigger).toBe("love");
  });

  it("matches multi-word triggers", () => {
    expect(detectLoveTrigger("oh laal mirch on top")?.trigger).toBe("laal mirch");
    expect(detectLoveTrigger("love you")?.trigger).toBe("love you");
  });

  it("matches the emoji trigger", () => {
    expect(detectLoveTrigger("harshit❤")?.trigger).toBe("harshit❤");
  });

  it("uses LOVE_MESSAGES when a mapping exists", () => {
    expect(detectLoveTrigger("mumma")?.message).toBe(LOVE_MESSAGES["mumma"]);
  });

  it("falls back to a generic love message for triggers without a custom mapping", () => {
    // A trigger that's in LOVE_TRIGGERS but missing from LOVE_MESSAGES gets the fallback.
    // (If every trigger has a mapping, this still asserts the fallback path is defined.)
    const result = detectLoveTrigger("papa");
    expect(result?.message).toBeTruthy();
  });

  it("returns null for non-matching input", () => {
    expect(detectLoveTrigger("hello world")).toBeNull();
    expect(detectLoveTrigger("")).toBeNull();
  });

  it("exposes the spec-listed trigger list", () => {
    expect(LOVE_TRIGGERS).toContain("mumma");
    expect(LOVE_TRIGGERS).toContain("love");
    expect(LOVE_TRIGGERS).toContain("harshit❤");
  });
});
```

- [ ] **Step 2: Run tests (expect failure — module not found)**

`pnpm vitest run components/eggs/use-love-triggers.test.ts`

- [ ] **Step 3: Implement `use-love-triggers.ts`**

```ts
// components/eggs/use-love-triggers.ts
//
// Pure detection for love-mode triggers. Word-boundary match, case-insensitive.
// "lover" does NOT match "love". Multi-word triggers ("love you", "laal mirch")
// match across whitespace. The emoji trigger "harshit❤" matches because the
// boundary regex treats the leading "h" as word-start.

export const LOVE_TRIGGERS = [
  "mumma",
  "papa",
  "didi",
  "doraemon",
  "laal mirch",
  "love",
  "love you",
  "miss you",
  "harshit❤",
] as const;

export type LoveTrigger = (typeof LOVE_TRIGGERS)[number];

export const LOVE_MESSAGES: Record<string, string> = {
  "mumma": "Hi Mumma. He loves you.",
  "papa": "Hi Papa. He's working hard.",
  "didi": "Hi Didi. He misses you.",
  "doraemon": "Hi Doraemon, Muaahh bby.",
  "laal mirch": "Laal mirch ka Kaala jaadu, hehe.",
  "miss you": "He misses you too.",
  "love": "Loved right back.",
  "love you": "Loved right back.",
  "harshit❤": "Caught you smiling. Take a break — the code's not going anywhere.",
};

const FALLBACK = "For you, with love. ♥";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Sort by length descending so multi-word triggers ("love you", "laal mirch")
// win against their single-word substrings ("love", "mirch") when both appear.
const TRIGGERS_BY_LENGTH = [...LOVE_TRIGGERS].sort((a, b) => b.length - a.length);

// Word boundary: start/end of string OR whitespace OR common punctuation.
// We do NOT use \b because it doesn't behave consistently around the heart emoji.
const BOUNDARY = "(?:^|[\\s!.?,;:])";
const BOUNDARY_END = "(?=$|[\\s!.?,;:])";

export interface LoveMatch {
  trigger: LoveTrigger;
  message: string;
}

export function detectLoveTrigger(text: string): LoveMatch | null {
  if (!text) return null;
  for (const trigger of TRIGGERS_BY_LENGTH) {
    const pattern = new RegExp(`${BOUNDARY}${escapeRegex(trigger)}${BOUNDARY_END}`, "i");
    if (pattern.test(text)) {
      return {
        trigger: trigger as LoveTrigger,
        message: LOVE_MESSAGES[trigger] ?? FALLBACK,
      };
    }
  }
  return null;
}
```

- [ ] **Step 4: Re-run — all green.**

- [ ] **Step 5: Write failing tests for `inline-commands`**

```ts
// components/eggs/inline-commands.test.ts
import { describe, it, expect } from "vitest";
import { detectInlineCommand } from "./inline-commands";

describe("detectInlineCommand", () => {
  it("matches sudo prefix and exposes the post-sudo input", () => {
    const r = detectInlineCommand("sudo make me a sandwich");
    expect(r?.kind).toBe("sudo");
    if (r?.kind === "sudo") {
      expect(r.input).toBe("sudo make me a sandwich");
    }
  });

  it("matches bare sudo", () => {
    expect(detectInlineCommand("sudo")?.kind).toBe("sudo");
  });

  it("does not match sudo as a substring of another word", () => {
    expect(detectInlineCommand("pseudoscience")).toBeNull();
  });

  it("matches whoami and /whoami", () => {
    expect(detectInlineCommand("whoami")?.kind).toBe("whoami");
    expect(detectInlineCommand("/whoami")?.kind).toBe("whoami");
    expect(detectInlineCommand("WHOAMI")?.kind).toBe("whoami");
  });

  it("does not match whoami inside another word", () => {
    expect(detectInlineCommand("whoamiwhocares")).toBeNull();
  });

  it("matches a love trigger", () => {
    const r = detectInlineCommand("hi mumma");
    expect(r?.kind).toBe("love");
    if (r?.kind === "love") {
      expect(r.trigger).toBe("mumma");
      expect(r.message).toBeTruthy();
    }
  });

  it("returns null for ordinary input", () => {
    expect(detectInlineCommand("what's your stack?")).toBeNull();
  });

  it("prefers sudo over love when sudo prefix matches", () => {
    // edge case: "sudo love" should be sudo, not love.
    expect(detectInlineCommand("sudo love")?.kind).toBe("sudo");
  });
});
```

- [ ] **Step 6: Run — expect failure.**

- [ ] **Step 7: Implement `inline-commands.ts`**

```ts
// components/eggs/inline-commands.ts
//
// Pure dispatch for chat-input easter eggs. Returns the first match in
// priority order: sudo > whoami > love. Pure: no React, no DOM. Side
// effects (toast / overlay) happen in the React hook that wraps this.

import { detectLoveTrigger, type LoveTrigger } from "./use-love-triggers";

export type InlineCommand =
  | { kind: "sudo"; input: string }
  | { kind: "whoami" }
  | { kind: "love"; trigger: LoveTrigger; message: string };

const SUDO_RE = /^\s*sudo(?:\s|$)/i;
const WHOAMI_RE = /^\s*\/?whoami\s*$/i;

export function detectInlineCommand(text: string): InlineCommand | null {
  if (!text) return null;

  if (SUDO_RE.test(text)) {
    return { kind: "sudo", input: text };
  }
  if (WHOAMI_RE.test(text)) {
    return { kind: "whoami" };
  }
  const love = detectLoveTrigger(text);
  if (love) {
    return { kind: "love", trigger: love.trigger, message: love.message };
  }
  return null;
}
```

- [ ] **Step 8: Re-run — all green. Commit.**

`git add components/eggs/use-love-triggers.ts components/eggs/use-love-triggers.test.ts components/eggs/inline-commands.ts components/eggs/inline-commands.test.ts && git commit`

Commit message: `feat(eggs): pure detectors — love triggers + inline commands`

---

## Task 2: `components/toast.tsx` — provider + hook + element

**Files:**
- Create: `components/toast.tsx`

Single-toast queue (newer wins). Renders one `aria-live="polite"` region inside a portal-free div fixed at the bottom-center of the viewport, `z-[200]` (above palette `z-[100]`, above sticky-followup `z-[5]`). Default duration 3.2s. Supports a "love" variant that styles the toast with serif italic.

- [ ] **Step 1: Implement `components/toast.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastOptions {
  durationMs?: number;
  variant?: "default" | "love";
}

interface ToastState {
  id: number;
  message: string;
  variant: "default" | "love";
}

interface ToastContextValue {
  show: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const show = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = ++idRef.current;
    setToast({ id, message, variant: opts.variant ?? "default" });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const duration = opts.durationMs ?? 3200;
    timerRef.current = window.setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
      timerRef.current = null;
    }, duration);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toast toast={toast} />
    </ToastContext.Provider>
  );
}

function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-8 z-[200] flex justify-center px-4"
    >
      {toast ? (
        <div
          role="status"
          className={
            toast.variant === "love"
              ? "pointer-events-auto max-w-[480px] whitespace-pre-wrap rounded-[14px] border border-border bg-bg-elev px-5 py-3 font-serif text-[15.5px] italic text-accent shadow-md"
              : "pointer-events-auto max-w-[480px] whitespace-pre-wrap rounded-[14px] border border-border bg-bg-elev px-5 py-3 font-mono text-[12.5px] text-fg-soft shadow-md"
          }
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit.**

`feat(toast): aria-live toast with queue-of-one + love variant`

---

## Task 3: `components/palette/*` — palette UI + tests

**Files:**
- Create: `components/palette/commands.ts`
- Create: `components/palette/command-list.tsx`
- Create: `components/palette/command-palette.tsx`
- Create: `components/palette/command-palette.test.tsx`

Five sections in fixed order. Hidden commands ONLY render when the search query is non-empty AND matches one of their keywords. Arrow keys move active item; Enter fires; Esc closes; focus trap restores focus to the trigger. Search is a substring + keyword match (no fuzzy lib).

- [ ] **Step 1: Define the command catalog**

```ts
// components/palette/commands.ts
export type CommandSection =
  | "Navigate"
  | "Audience"
  | "Connect"
  | "Settings"
  | "Hidden";

export interface Command {
  id: string;
  label: string;
  kbd?: string;
  section: CommandSection;
  keywords?: string[];
  hidden?: boolean;
}

// Display order; sections without visible items are skipped at render time.
export const SECTION_ORDER: CommandSection[] = [
  "Navigate",
  "Audience",
  "Connect",
  "Settings",
  "Hidden",
];

// Static command shape — handlers are wired in command-palette.tsx because
// they need access to the palette/toast/eggs context.
export const COMMAND_CATALOG: Command[] = [
  // Navigate
  { id: "nav.ask", label: "Ask…", kbd: "↩", section: "Navigate" },
  { id: "nav.work", label: "Jump to Work", kbd: "W", section: "Navigate", keywords: ["projects"] },
  { id: "nav.now", label: "Jump to Now", kbd: "N", section: "Navigate" },
  { id: "nav.footer", label: "Jump to Footer", kbd: "↓", section: "Navigate", keywords: ["contact"] },

  // Audience
  { id: "audience.curious", label: "Switch view → Curious", kbd: "1", section: "Audience" },
  { id: "audience.recruiter", label: "Switch view → Recruiter", kbd: "2", section: "Audience" },
  { id: "audience.engineer", label: "Switch view → Engineer", kbd: "3", section: "Audience" },

  // Connect
  { id: "connect.linkedin", label: "LinkedIn", section: "Connect" },
  { id: "connect.github", label: "GitHub", section: "Connect" },
  { id: "connect.gitlab", label: "GitLab", section: "Connect" },
  { id: "connect.email", label: "Email", section: "Connect" },

  // Settings
  { id: "settings.theme", label: "Toggle theme", kbd: "T", section: "Settings" },
  { id: "settings.resume", label: "Download résumé", kbd: "R", section: "Settings" },

  // Hidden — surface only on search match
  { id: "hidden.love", label: "For someone you love ♥", section: "Hidden", hidden: true, keywords: ["love", "heart", "mumma", "papa"] },
  { id: "hidden.joke", label: "Tell me a joke", section: "Hidden", hidden: true, keywords: ["joke", "funny", "haha"] },
  { id: "hidden.konami", label: "Activate Konami mode", section: "Hidden", hidden: true, keywords: ["konami", "sparkle", "cheat"] },
  { id: "hidden.matrix", label: "Enter the Matrix", section: "Hidden", hidden: true, keywords: ["matrix", "neo", "rain"] },
  { id: "hidden.credits", label: "Roll the credits", section: "Hidden", hidden: true, keywords: ["credits", "thanks"] },
];

export function filterCommands(catalog: Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return catalog.filter((c) => !c.hidden);
  }
  return catalog.filter((c) => {
    const haystack = [c.label, ...(c.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
```

- [ ] **Step 2: Implement `command-list.tsx`**

```tsx
// components/palette/command-list.tsx
"use client";

import { useEffect, useRef } from "react";
import type { Command } from "./commands";
import { SECTION_ORDER } from "./commands";

interface CommandListProps {
  commands: Command[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onFire: (id: string) => void;
}

export function CommandList({ commands, activeId, onActivate, onFire }: CommandListProps) {
  // Group by section, preserving SECTION_ORDER.
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: commands.filter((c) => c.section === section),
  })).filter((g) => g.items.length > 0);

  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  if (grouped.length === 0) {
    return (
      <div className="px-4 py-8 text-center font-mono text-[12px] text-muted">
        No matches.
      </div>
    );
  }

  return (
    <div role="listbox" aria-label="Commands" className="max-h-[420px] overflow-y-auto py-2">
      {grouped.map((group) => (
        <div key={group.section}>
          <div className="px-4 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
            {group.section}
          </div>
          <ul>
            {group.items.map((cmd) => {
              const active = cmd.id === activeId;
              return (
                <li key={cmd.id}>
                  <button
                    ref={active ? activeRef : null}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-command-id={cmd.id}
                    onMouseMove={() => onActivate(cmd.id)}
                    onClick={() => onFire(cmd.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[14px] transition-colors ${
                      active ? "bg-accent-soft text-accent" : "text-fg-soft hover:bg-bg-sunk"
                    }`}
                  >
                    <span>{cmd.label}</span>
                    {cmd.kbd ? (
                      <kbd className="rounded-[6px] border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-muted">
                        {cmd.kbd}
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement `command-palette.tsx`**

```tsx
// components/palette/command-palette.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CommandList } from "./command-list";
import { COMMAND_CATALOG, filterCommands } from "./commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onFire: (commandId: string) => void;
}

export function CommandPalette({ open, onClose, onFire }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const visible = useMemo(() => filterCommands(COMMAND_CATALOG, query), [query]);

  // Reset query + focus + active item when opening.
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    setQuery("");
    setActiveId(visible[0]?.id ?? null);
    // Defer focus to after the dialog paints.
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep active item valid when query changes.
  useEffect(() => {
    if (!open) return;
    if (visible.length === 0) {
      setActiveId(null);
    } else if (!visible.some((c) => c.id === activeId)) {
      setActiveId(visible[0].id);
    }
  }, [visible, activeId, open]);

  // Focus restore on close.
  useEffect(() => {
    if (open) return;
    lastFocusedRef.current?.focus?.();
  }, [open]);

  if (!open) return null;

  function move(delta: number) {
    if (visible.length === 0) return;
    const idx = visible.findIndex((c) => c.id === activeId);
    const next = ((idx < 0 ? 0 : idx) + delta + visible.length) % visible.length;
    setActiveId(visible[next].id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeId) onFire(activeId);
    } else if (e.key === "Tab") {
      // Simple focus trap: keep focus on the input.
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-fg/30 backdrop-blur-sm" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-[560px] overflow-hidden rounded-[16px] border border-border bg-bg-elev shadow-md"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span aria-hidden className="font-mono text-[12px] text-muted">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, or search…"
            aria-label="Search commands"
            className="flex-1 bg-transparent text-[14px] text-fg placeholder:text-muted-2 focus:outline-none"
          />
        </div>
        <CommandList
          commands={visible}
          activeId={activeId}
          onActivate={setActiveId}
          onFire={onFire}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write failing tests**

```tsx
// components/palette/command-palette.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  afterEach(() => cleanup());

  it("renders the 4 default sections when open with no query", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    expect(screen.getByText("Navigate")).toBeTruthy();
    expect(screen.getByText("Audience")).toBeTruthy();
    expect(screen.getByText("Connect")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    // Hidden section should NOT appear in default open.
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("returns null when closed", () => {
    const { container } = render(<CommandPalette open={false} onClose={() => {}} onFire={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} onFire={() => {}} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("filters commands by the search query", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    const input = screen.getByLabelText("Search commands") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "github" } });
    expect(screen.getByText("GitHub")).toBeTruthy();
    expect(screen.queryByText("LinkedIn")).toBeNull();
  });

  it("surfaces a hidden command only when its keyword matches", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    expect(screen.queryByText("Enter the Matrix")).toBeNull();
    const input = screen.getByLabelText("Search commands") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "matrix" } });
    expect(screen.getByText("Enter the Matrix")).toBeTruthy();
  });

  it("fires the active command on Enter", () => {
    const onFire = vi.fn();
    render(<CommandPalette open={true} onClose={() => {}} onFire={onFire} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });
    // First visible command is "nav.ask".
    expect(onFire).toHaveBeenCalledWith("nav.ask");
  });

  it("moves the active item with arrow keys", () => {
    const onFire = vi.fn();
    render(<CommandPalette open={true} onClose={() => {}} onFire={onFire} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    // After one ArrowDown from "nav.ask", second visible command is "nav.work".
    expect(onFire).toHaveBeenCalledWith("nav.work");
  });
});
```

- [ ] **Step 5: Run — all green. Commit.**

`feat(palette): command palette UI — focus-trap, kbd nav, hidden-on-match`

---

## Task 4: Overlays — `sparkle`, `love`, `matrix`

**Files:**
- Create: `components/eggs/sparkle-overlay.tsx`
- Create: `components/eggs/love-overlay.tsx`
- Create: `components/eggs/matrix-overlay.tsx`

Each is a self-contained client component that paints for its duration and unmounts itself by calling `onDone`. The parent (Chrome) drives `next/dynamic` + render-on-trigger so initial bundle stays clean. Each respects `prefers-reduced-motion` by exiting immediately (toast still fires from the trigger site).

- [ ] **Step 1: `sparkle-overlay.tsx`** — 3.2s, 10 SVG stars at random positions, CSS keyframe scale+fade.

```tsx
"use client";

import { useEffect } from "react";

interface SparkleOverlayProps {
  onDone: () => void;
}

export function SparkleOverlay({ onDone }: SparkleOverlayProps) {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(onDone, reduce ? 50 : 3200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const sparkles = Array.from({ length: 14 }).map((_, i) => {
    const left = `${Math.round(Math.random() * 100)}%`;
    const top = `${Math.round(Math.random() * 100)}%`;
    const size = 16 + Math.round(Math.random() * 18);
    const delay = `${Math.round(Math.random() * 1200)}ms`;
    return (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="absolute animate-[rrSparkle_1200ms_var(--ease)_both]"
        style={{ left, top, animationDelay: delay, color: "var(--accent)" }}
        aria-hidden
      >
        <path
          d="M12 2 L13.6 9.4 21 11 13.6 12.6 12 20 10.4 12.6 3 11 10.4 9.4 Z"
          fill="currentColor"
        />
      </svg>
    );
  });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[150]">
      {sparkles}
      <style jsx>{`
        @keyframes rrSparkle {
          0% { opacity: 0; transform: scale(0.4) rotate(-20deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(0deg); }
          100% { opacity: 0; transform: scale(0.6) rotate(20deg); }
        }
      `}</style>
    </div>
  );
}

export default SparkleOverlay;
```

- [ ] **Step 2: `love-overlay.tsx`** — 7s; toggles `html[data-mode="love"]`; rose vignette; ~20 floating hearts.

```tsx
"use client";

import { useEffect } from "react";

interface LoveOverlayProps {
  onDone: () => void;
}

export function LoveOverlay({ onDone }: LoveOverlayProps) {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.setAttribute("data-mode", "love");
    const duration = reduce ? 50 : 7000;
    const t = window.setTimeout(() => {
      document.documentElement.removeAttribute("data-mode");
      onDone();
    }, duration);
    return () => {
      window.clearTimeout(t);
      document.documentElement.removeAttribute("data-mode");
    };
  }, [onDone]);

  const hearts = Array.from({ length: 22 }).map((_, i) => {
    const left = `${Math.round(Math.random() * 100)}%`;
    const size = 18 + Math.round(Math.random() * 22);
    const delay = `${Math.round(Math.random() * 2000)}ms`;
    const dur = 4500 + Math.round(Math.random() * 1800);
    return (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="absolute bottom-[-40px] animate-[rrHeartRise_var(--rrDur)_linear_var(--rrDelay)_both]"
        style={
          {
            left,
            color: "var(--accent)",
            ["--rrDur" as string]: `${dur}ms`,
            ["--rrDelay" as string]: delay,
          } as React.CSSProperties
        }
        aria-hidden
      >
        <path
          d="M12 21s-7-4.5-9.3-9.1C1 8.6 2.6 5 6 5c2 0 3.5 1.1 4.4 2.6C11.2 6.1 12.7 5 14.7 5 18.1 5 19.7 8.6 18.1 11.9 16 16.5 12 21 12 21Z"
          fill="currentColor"
        />
      </svg>
    );
  });

  return (
    <div aria-hidden data-love-overlay className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(232,93,138,0) 30%, rgba(232,93,138,0.18) 100%)",
        }}
      />
      {hearts}
      <style jsx>{`
        @keyframes rrHeartRise {
          0% { transform: translateY(0) rotate(-6deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(8deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default LoveOverlay;
```

- [ ] **Step 3: `matrix-overlay.tsx`** — 8s; canvas katakana rain in `var(--accent)`.

```tsx
"use client";

import { useEffect, useRef } from "react";

interface MatrixOverlayProps {
  onDone: () => void;
}

const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789";

export function MatrixOverlay({ onDone }: MatrixOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = window.setTimeout(onDone, 50);
      return () => window.clearTimeout(t);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx?.scale(dpr, dpr);
    }
    resize();

    const fontSize = 16;
    const cols = Math.floor(window.innerWidth / fontSize);
    const drops = new Array(cols).fill(0).map(() => Math.random() * -50);

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#34d399";

    let raf = 0;
    const start = performance.now();
    function frame(t: number) {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(12,13,15,0.18)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = accent;
      ctx.font = `${fontSize}px var(--mono), monospace`;
      for (let i = 0; i < drops.length; i++) {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(ch, x, y);
        if (y > window.innerHeight && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      if (t - start < 8000) {
        raf = requestAnimationFrame(frame);
      } else {
        onDone();
      }
    }
    raf = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[150]"
      style={{ background: "rgba(12,13,15,0.7)" }}
    />
  );
}

export default MatrixOverlay;
```

- [ ] **Step 4: Commit.**

`feat(eggs): sparkle, love, matrix overlays — self-cleaning, motion-aware`

---

## Task 5: Hooks — `use-konami.ts` + `use-logo-click-counter.ts`

**Files:**
- Create: `components/eggs/use-konami.ts`
- Create: `components/eggs/use-logo-click-counter.ts`

`useKonami(onComplete)` listens for `↑↑↓↓←→←→ B A`. Bails when `document.activeElement` is INPUT/TEXTAREA. `useLogoClickCounter()` returns `{ count, increment }`; increment fires toast at counts 5/10/15 via injected toast.

- [ ] **Step 1: `use-konami.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";

const SEQUENCE = [
  "ArrowUp", "ArrowUp",
  "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight",
  "ArrowLeft", "ArrowRight",
  "b", "a",
];

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKonami(onComplete: () => void) {
  const idxRef = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) {
        idxRef.current = 0;
        return;
      }
      const expected = SEQUENCE[idxRef.current];
      const key = expected.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        idxRef.current++;
        if (idxRef.current === SEQUENCE.length) {
          idxRef.current = 0;
          onComplete();
        }
      } else {
        // Allow restart if the first key is hit again.
        idxRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);
}
```

- [ ] **Step 2: `use-logo-click-counter.ts`**

```ts
"use client";

import { useCallback, useRef, useState } from "react";

// Drafted hint copy — flagged in PR review for user tweak.
export const BRAND_CLICK_HINTS: Record<number, string> = {
  5: "You found the easter egg track. Keep going.",
  10: "Persistent. There's one more.",
  15: "Try ⌘K — the good stuff's in there.",
};

export function useLogoClickCounter(onHint: (message: string) => void) {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
    const hint = BRAND_CLICK_HINTS[countRef.current];
    if (hint) onHint(hint);
  }, [onHint]);

  return { count, increment };
}
```

- [ ] **Step 3: Commit.**

`feat(eggs): useKonami + useLogoClickCounter — input-focus aware, ref-backed counter`

---

## Task 6: `components/chrome.tsx` — single client wrapper

**Files:**
- Create: `components/chrome-context.ts`
- Create: `components/chrome.tsx`
- Create: `components/eggs/use-inline-commands.ts`

Single client component that mounts Toast + Palette + Eggs providers, registers global Cmd-K listener, registers Konami listener, lazy-loads the three overlays via `next/dynamic({ ssr: false })`. Exports `usePalette()`, `useToast()` (re-exported from `toast.tsx`), `useEggs()` for downstream consumers.

- [ ] **Step 1: `chrome-context.ts`** — context types + hook exports.

```ts
"use client";

import { createContext, useContext } from "react";

export interface PaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface EggsContextValue {
  triggerSparkle: () => void;
  triggerLove: () => void;
  triggerMatrix: () => void;
}

export const PaletteContext = createContext<PaletteContextValue | null>(null);
export const EggsContext = createContext<EggsContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used inside <Chrome>");
  return ctx;
}

export function useEggs(): EggsContextValue {
  const ctx = useContext(EggsContext);
  if (!ctx) throw new Error("useEggs must be used inside <Chrome>");
  return ctx;
}
```

- [ ] **Step 2: `chrome.tsx`** — orchestrator.

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "./palette/command-palette";
import { ToastProvider, useToast } from "./toast";
import { PaletteContext, EggsContext } from "./chrome-context";
import { useKonami } from "./eggs/use-konami";
import { detectLoveTrigger } from "./eggs/use-love-triggers";
import type { Audience } from "@/lib/sse";

const SparkleOverlay = dynamic(() => import("./eggs/sparkle-overlay"), { ssr: false });
const LoveOverlay = dynamic(() => import("./eggs/love-overlay"), { ssr: false });
const MatrixOverlay = dynamic(() => import("./eggs/matrix-overlay"), { ssr: false });

const HIDDEN_JOKES = [
  "Two SSE streams walk into a bar. The bartender says, why so chunky?",
  "I told my code to be more independent. Now it has its own opinions.",
  "There are 10 kinds of devs: those who write tests and those who debug in prod.",
];

const HIDDEN_CREDITS = "Built by Harshit. Powered by curiosity, RAG, and one extra coffee.";

function persistAudience(a: Audience) {
  try {
    window.localStorage.setItem("rr_audience", a);
  } catch {
    // ignore
  }
}

function ChromeInner({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [love, setLove] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const toast = useToast();

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const triggerSparkle = useCallback(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      toast.show("✦ konami ✦ — sparkle (motion off)");
      return;
    }
    setSparkle(true);
  }, [toast]);

  const triggerLove = useCallback(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // toast is fired by the caller
    setLove(true);
  }, []);

  const triggerMatrix = useCallback(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      toast.show("> entering the matrix… (motion off)");
      return;
    }
    setMatrix(true);
  }, [toast]);

  // Global Cmd/Ctrl-K listener — open palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((cur) => !cur);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Konami listener — fires sparkle. Hook handles input-focus bail.
  useKonami(() => {
    triggerSparkle();
    toast.show("✦ konami ✦ unlocked");
  });

  function fireCommand(id: string) {
    closePalette();
    switch (id) {
      case "nav.ask": {
        const input = document.querySelector<HTMLTextAreaElement>(
          'textarea[placeholder*="Ask"]'
        );
        input?.focus();
        return;
      }
      case "nav.work":
        document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "nav.now":
        document.getElementById("now")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "nav.footer":
        document.getElementById("footer")?.scrollIntoView({ behavior: "smooth" });
        return;
      case "audience.curious":
      case "audience.recruiter":
      case "audience.engineer": {
        const audience = id.split(".")[1] as Audience;
        persistAudience(audience);
        // The chat shell reads localStorage on mount; reload to re-pick up the choice.
        // (Phase 5b will swap this for a cross-component bus.)
        window.location.reload();
        return;
      }
      case "connect.linkedin":
        window.open("https://www.linkedin.com/in/harshit-sindhu/", "_blank", "noopener,noreferrer");
        return;
      case "connect.github":
        window.open("https://github.com/HArshit123455", "_blank", "noopener,noreferrer");
        return;
      case "connect.gitlab":
        window.open("https://gitlab.com/harshit_sindhu", "_blank", "noopener,noreferrer");
        return;
      case "connect.email":
        window.location.href = "mailto:harshitsindhu10@gmail.com";
        return;
      case "settings.theme": {
        const cur = document.documentElement.getAttribute("data-theme");
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          window.localStorage.setItem("theme", next);
        } catch {
          // ignore
        }
        return;
      }
      case "settings.resume":
        window.open("/resume.pdf", "_blank", "noopener,noreferrer");
        return;
      case "hidden.love": {
        const msg = detectLoveTrigger("love")?.message ?? "For you, with love. ♥";
        triggerLove();
        toast.show(msg, { variant: "love", durationMs: 7000 });
        return;
      }
      case "hidden.joke": {
        const joke = HIDDEN_JOKES[Math.floor(Math.random() * HIDDEN_JOKES.length)];
        toast.show(joke);
        return;
      }
      case "hidden.konami":
        triggerSparkle();
        toast.show("✦ konami ✦ unlocked");
        return;
      case "hidden.matrix":
        triggerMatrix();
        return;
      case "hidden.credits":
        toast.show(HIDDEN_CREDITS, { durationMs: 5000 });
        return;
    }
  }

  return (
    <PaletteContext.Provider value={{ isOpen: paletteOpen, open: openPalette, close: closePalette }}>
      <EggsContext.Provider value={{ triggerSparkle, triggerLove, triggerMatrix }}>
        {children}
        <CommandPalette open={paletteOpen} onClose={closePalette} onFire={fireCommand} />
        {sparkle ? <SparkleOverlay onDone={() => setSparkle(false)} /> : null}
        {love ? <LoveOverlay onDone={() => setLove(false)} /> : null}
        {matrix ? <MatrixOverlay onDone={() => setMatrix(false)} /> : null}
      </EggsContext.Provider>
    </PaletteContext.Provider>
  );
}

export function Chrome({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ChromeInner>{children}</ChromeInner>
    </ToastProvider>
  );
}
```

- [ ] **Step 3: `use-inline-commands.ts`** — hook wrapping submit.

```ts
"use client";

import { useCallback } from "react";
import { detectInlineCommand } from "./inline-commands";
import { useToast } from "../toast";
import { useEggs } from "../chrome-context";

export function useInlineCommands(onSubmit: (text: string) => void) {
  const toast = useToast();
  const { triggerLove } = useEggs();

  return useCallback(
    (text: string) => {
      const cmd = detectInlineCommand(text);
      if (cmd) {
        if (cmd.kind === "sudo") {
          toast.show(`> ${cmd.input}\n[sudo] permission granted. you're cool.`);
        } else if (cmd.kind === "whoami") {
          toast.show("harshit · full-stack · uid=1337 · groups=builders, readers, listeners");
        } else if (cmd.kind === "love") {
          triggerLove();
          toast.show(cmd.message, { variant: "love", durationMs: 7000 });
        }
        return;
      }
      onSubmit(text);
    },
    [onSubmit, toast, triggerLove]
  );
}
```

- [ ] **Step 4: Commit.**

`feat(chrome): single client wrapper — providers, Cmd-K, Konami, lazy overlays`

---

## Task 7: Wire `Chrome` into layout + header pill + brand counter + footer click + footer anchor

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/header.tsx`
- Modify: `components/footer.tsx`
- Create: `components/palette/cmd-k-pill.tsx`
- Create: `components/eggs/brand-wordmark.tsx`

- [ ] **Step 1: `cmd-k-pill.tsx`**

```tsx
"use client";

import { usePalette } from "../chrome-context";

export function CmdKPill() {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      className="hidden items-center gap-1.5 rounded-pill border border-border bg-bg-elev px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg sm:inline-flex"
    >
      <kbd className="font-mono">⌘K</kbd>
      <span aria-hidden>·</span>
      <span>commands</span>
    </button>
  );
}
```

- [ ] **Step 2: `brand-wordmark.tsx`** — extracted brand link with click counter.

```tsx
"use client";

import Link from "next/link";
import { useLogoClickCounter } from "./use-logo-click-counter";
import { useToast } from "../toast";

export function BrandWordmark() {
  const toast = useToast();
  const { increment } = useLogoClickCounter((msg) => toast.show(msg));

  return (
    <Link
      href="/"
      onClick={(e) => {
        // Allow navigation when not on the home route; on home, the increment is the whole effect.
        if (typeof window !== "undefined" && window.location.pathname === "/") {
          e.preventDefault();
        }
        increment();
      }}
      className="group inline-flex items-baseline gap-0 leading-none"
      aria-label="Harshit Sindhu — home"
    >
      <span className="font-serif text-2xl font-medium italic tracking-tight text-fg">
        harshit
      </span>
      <span
        aria-hidden
        className="ml-[3px] inline-block h-1.5 w-1.5 translate-y-0.5 rounded-full bg-accent"
      />
      <small className="ml-3.5 border-l border-border pl-3.5 font-sans text-xs font-normal not-italic text-muted">
        Full-stack engineer
      </small>
    </Link>
  );
}
```

- [ ] **Step 3: Modify `header.tsx`** — swap brand for `<BrandWordmark/>`; insert `<CmdKPill/>` before `<ThemeToggle/>`.

- [ ] **Step 4: Modify `footer.tsx`** — make "press ⌘K for the good stuff" accent text a `<button>` that calls `usePalette().open()`; add `id="footer"` to the `<footer>` element.

- [ ] **Step 5: Modify `app/layout.tsx`** — wrap `<Header />` + `{children}` in `<Chrome>`.

```tsx
<body className="bg-bg text-fg">
  <Chrome>
    <Header />
    <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
  </Chrome>
</body>
```

- [ ] **Step 6: Commit.**

`feat(chrome): mount Chrome in layout — header pill, footer click, brand counter`

---

## Task 8: Wire `useInlineCommands` into `chat-input.tsx`

**Files:**
- Modify: `components/chat/chat-input.tsx`

- [ ] **Step 1: Wrap submit in `useInlineCommands(onSubmit)`** — replace the bare `onSubmit(trimmed)` with the wrapped version. Note that `useInlineCommands` returns a function that has the same shape as the prop; it either swallows (egg fired) or forwards.

- [ ] **Step 2: Verify the existing `<StickyFollowup/>` does NOT need the same wrapping** — per spec, easter eggs fire from the chat input only. Sticky followup is an in-thread continuation; egg behavior in follow-up turns is out of scope for 5a.

- [ ] **Step 3: Commit.**

`feat(chat-input): intercept sudo/whoami/love before submit`

---

## Task 9: Drop `public/resume.pdf` placeholder

**Files:**
- Create: `public/resume.pdf`

Minimal valid 1-page PDF stub. Real PDF arrives in Phase 5b.

- [ ] **Step 1: Write a 1-page PDF with placeholder text** ("Résumé coming soon — see harshit.sh"). Use a known-good minimal PDF byte template, written via a tiny `node` one-liner or hand-crafted bytes. Verify the file opens in a browser PDF viewer.

- [ ] **Step 2: Commit.**

`content: placeholder resume.pdf — real PDF arrives in Phase 5b`

---

## Task 10: e2e tests + build gate

**Files:**
- Create: `e2e/palette.spec.ts`
- Create: `e2e/konami.spec.ts`
- Create: `e2e/love-mode.spec.ts`

These run against `pnpm dev` (already wired in `playwright.config.ts`). User runs them locally — this task lands the specs only.

- [ ] **Step 1: `e2e/palette.spec.ts`** — Cmd-K opens, 4 sections visible, Esc closes.

```ts
import { test, expect } from "@playwright/test";

test("Cmd-K opens the palette with 4 default sections; Esc closes", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Navigate")).toBeVisible();
  await expect(dialog.getByText("Audience")).toBeVisible();
  await expect(dialog.getByText("Connect")).toBeVisible();
  await expect(dialog.getByText("Settings")).toBeVisible();
  await expect(dialog.getByText("Hidden")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
```

- [ ] **Step 2: `e2e/konami.spec.ts`** — sequence triggers sparkle.

```ts
import { test, expect } from "@playwright/test";

test("Konami sequence triggers sparkle overlay", async ({ page }) => {
  await page.goto("/");
  // Click somewhere neutral so the body has focus (not the chat textarea).
  await page.locator("header").click();
  for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) {
    await page.keyboard.press(k);
  }
  await expect(page.getByRole("status").filter({ hasText: /konami/i })).toBeVisible({ timeout: 2000 });
});
```

- [ ] **Step 3: `e2e/love-mode.spec.ts`** — "mumma" in chat input fires hearts + accent shift.

```ts
import { test, expect } from "@playwright/test";

test("typing 'mumma' in chat input triggers love mode", async ({ page }) => {
  await page.goto("/");
  const input = page.getByPlaceholder(/Ask anything about Harshit/i);
  await input.fill("hi mumma");
  await input.press("Enter");
  await expect(page.locator("html[data-mode='love']")).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole("status").filter({ hasText: /Mumma/ })).toBeVisible();
});
```

- [ ] **Step 4: Build gate** — `pnpm typecheck && pnpm build`. Confirm the First Load JS for `/` stays ≤ ~60 kB (palette + toast in initial bundle; overlays lazy-loaded).

- [ ] **Step 5: Vitest non-DB suite** —
`pnpm vitest run components lib/rag/citation-parser.test.ts lib/rag/cache.test.ts lib/clients lib/content`

- [ ] **Step 6: Commit.**

`test(e2e): palette / konami / love-mode specs`

---

## Out of scope for 5a (deferred to 5b)

- Real `public/resume.pdf` (user provides actual PDF; placeholder lands here).
- Final wording for brand-click hints (drafted; user tweaks in PR review).
- Audience voice blurbs in `lib/rag/generate.ts::VOICE_INSTRUCTIONS` (Phase 5b content task).
- Cross-component audience switch bus (5a uses `window.location.reload()` after palette flip — simple, works, replaced in 5b if/when needed).
- Visual regression Playwright snapshots (the spec lists these for the whole project; 5a only adds functional e2e specs).

## Caveats / known follow-ups

- **First-load bundle:** Palette + Toast + Chrome glue are in the initial bundle (~6 kB target per spec). The three overlays are `next/dynamic({ ssr: false })` and add nothing until first trigger. Phase 4 baseline is 50.8 kB First Load JS; target after Phase 5a is ≤ 60 kB.
- **Audience palette switch reloads the page** — keeps the implementation tiny. A cross-tree state bus (custom event, Zustand, or a moved-up context) would be the right move if/when the chat shell needs to react to the change without a reload. Flag in PR.
- **Brand-click hint texts** are drafted in `use-logo-click-counter.ts::BRAND_CLICK_HINTS` — surfaced for the user to tweak in PR review per spec's open items list.
- **Hidden joke pool** is 3 jokes drafted inline in `chrome.tsx`. User can replace in 5b.
- **`prefers-reduced-motion`** drops every overlay to a toast (or to no overlay, in love's case — the caller already fires the toast). Verified at the overlay level and at the trigger level so it can't slip through.
- **`whoami` regex** matches only on bare-line inputs (`whoami` or `/whoami`) — typing "whoami today" goes through as a real chat question. This matches the spec's "matches `whoami` or `/whoami`" wording.
- **Konami listener** restarts on the FIRST key of the sequence if the user mis-types, so a stray `↑` after a long pause doesn't strand the state machine.
