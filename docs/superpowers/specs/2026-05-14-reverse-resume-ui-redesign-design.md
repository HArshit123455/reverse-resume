# Reverse Resume — UI / UX Redesign Design

**Date:** 2026-05-14
**Status:** Design approved, ready for implementation plan
**Predecessor:** `2026-05-10-reverse-resume-design.md` (initial product design — Phases 0–7)

---

## 1. Executive summary

Phases 0–7 shipped a working reverse-resume: chat answers grounded in retrieved code snippets and experience MDX, citations panel, streaming, rate limits, retrieval eval at recall@5 = 1.000. The backend is production-ready.

The frontend is not. Two blocking issues surfaced during local testing:

1. **Bug — raw markdown.** Assistant messages render literal `**bold**`, `[1]` citation markers, fenced ```` ```ts ```` code blocks, and list syntax as plain text. The chat shell uses `<div className="whitespace-pre-wrap">{m.content}</div>` (`components/chat-shell.tsx:113`), which preserves newlines but does not parse markdown.
2. **Polish — bland defaults.** The site renders with Tailwind defaults: system sans-serif, neutral-100 gray bubbles, no design system, no dark mode, `text-xs` code blocks, no visual hierarchy beyond size. For a recruiter-facing portfolio whose core differentiator is "verifiable evidence," the bland presentation undercuts the content.

This phase fixes both: markdown rendering becomes a first-class concern, and the entire site moves to a minimal-editorial design system (serif headlines, refined typography, light + dark theme, interactive citations).

**Out of scope:** the API routes, RAG pipeline, ingest, eval, DB schema, and the 25 snippet + 5 experience MDX files — all sealed.

---

## 2. Goals and non-goals

**Goals**

- Render assistant messages as proper GitHub-flavored markdown: bold, italic, lists, links, inline code, fenced code blocks, blockquotes.
- Transform inline `[N]` citation markers into interactive elements: hover preview popover, click smooth-scrolls to the matching card and pulses it.
- Establish a coherent design system: design tokens (color, typography, spacing) implemented as CSS variables; light + dark theme with class-on-html switching; no-flash theme initialization.
- Refine every existing UI surface to the new system: hero, demo-prompt pills, conversation bubbles, input row, citations panel cards, code blocks, footer, plus a new minimal header with name + theme toggle.
- Responsive: ≥768px keeps the right-rail citations panel; <768px collapses citations into a `<details>` accordion below the conversation. Hover popovers degrade to tap-to-scroll on touch devices.
- Accessibility: every interactive element is a real focusable button, keyboard-operable, with visible focus rings; popovers are `role="tooltip"` with proper `aria-describedby`; color contrast passes WCAG AA in both themes; `prefers-reduced-motion` disables the citation pulse and smooth-scroll.

**Non-goals**

- No new pages, routes, or admin UI. Single-page site stays single-page.
- No analytics, no error reporting, no feedback widget.
- No animations beyond the citation pulse and theme transition (no scroll reveals, no Framer Motion).
- No conversation history persistence (refresh still loses chat — same as Phase 5).
- No streaming-render performance optimizations (re-parse per token is fine at this content size).
- No keyboard shortcuts (`Cmd+K` etc.). Possible follow-up.
- No CMS for content. MDX files in `content/` remain the source of truth.

---

## 3. Decisions captured during brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Design direction | **A. Minimal & Editorial** | Serif headlines, generous whitespace, subtle blue accent. Reads as a thoughtful engineer's portfolio, familiar to recruiters from Notion/Linear marketing pages. Two alternates (B: dark distinctive engineering, C: polished professional w/ shadcn vibe) considered and rejected. |
| Theme | **Light + dark toggle** | Adds ~30% design work (every token needs a dark counterpart) but matches modern portfolio expectations. Class-on-html via `darkMode: "class"` in Tailwind. |
| Mobile citations layout | **Stacked `<details>` accordion below chat** | Native HTML element, no JS, no ARIA needed, screen readers handle it. Hover popover suppressed on touch (`@media (hover: none)`); tap just scrolls + auto-opens the accordion. |
| Citation interaction | **Hover popover + click-to-scroll** | Hover (desktop only, 150ms delay) shows a small dark popover with title + meta + first ~120 chars. Click dispatches `citation:focus` event; panel scrolls the card into view and pulses its border for 1.6s. |
| Implementation stack | **CSS-variable tokens + `@tailwindcss/typography` + `react-markdown` + `remark-gfm`** | Hand-rolled tokens preserve the editorial direction without a UI kit's house style. `react-markdown` is the standard React markdown renderer; `remark-gfm` adds GitHub-flavored extensions (tables, strikethrough, autolinks). Typography plugin handles prose styling. ~30KB gzipped total. Rejected alternates: shadcn/ui (overkill — only 2–3 new primitives needed), CSS-only with hand-rolled parser (negative ROI). |
| Hover popover impl | **Hand-rolled first, swap to Radix HoverCard only if keyboard semantics get ugly** | Saves one dep until pain is concrete. |
| Code block rename | **`code-block.tsx` → `shiki-code.tsx` via `git mv`** | Cleaner naming once we add Copy button + theme awareness. `git mv` preserves history. |

---

## 4. Design system

### 4.1 Typography

| Role | Font | Fallback chain |
|---|---|---|
| Display, h1, h2 | `Charter` (system-installed on macOS) → `Source Serif 4` (loaded via `next/font/google`) | `Georgia, "Times New Roman", serif` |
| Body, UI text | `Inter` (loaded via `next/font/google`, subset `latin`, `display:swap`) | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Code (inline + blocks) | system mono | `ui-monospace, SFMono-Regular, "Cascadia Code", "Roboto Mono", Consolas, monospace` |

Sizes (Tailwind utilities, no custom scale): h1 `text-4xl tracking-tight font-medium font-serif`, h2 `text-2xl font-serif`, body `text-[15px] leading-[1.65]`, small/caption `text-xs`, code blocks `text-[13px] leading-relaxed`.

### 4.2 Color tokens (CSS variables)

Defined on `:root` (light) and `:root.dark` (dark). Tailwind config exposes them as utility classes via `theme.extend.colors`.

```css
:root {
  --bg:        #fafafa;
  --surface:   #ffffff;
  --text:      #0f172a;
  --text-soft: #475569;
  --muted:     #94a3b8;
  --border:    #e5e7eb;
  --border-strong: #d1d5db;
  --accent:    #2563eb;
  --accent-bg: #eff6ff;
  --highlight: rgba(37, 99, 235, 0.08);
  --code-bg:   #f3f4f6;
  --shadow:    0 1px 2px rgba(15, 23, 42, 0.04);
}

:root.dark {
  --bg:        #0a0a0a;
  --surface:   #131316;
  --text:      #f1f5f9;
  --text-soft: #94a3b8;
  --muted:     #64748b;
  --border:    #1f2937;
  --border-strong: #334155;
  --accent:    #60a5fa;
  --accent-bg: rgba(96, 165, 250, 0.12);
  --highlight: rgba(96, 165, 250, 0.14);
  --code-bg:   #18181b;
  --shadow:    0 1px 2px rgba(0, 0, 0, 0.3);
}
```

Tailwind aliases (added in `tailwind.config.cjs`):
```js
theme: {
  extend: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      "text-soft": "var(--text-soft)",
      muted: "var(--muted)",
      border: "var(--border)",
      "border-strong": "var(--border-strong)",
      accent: "var(--accent)",
      "accent-bg": "var(--accent-bg)",
      "code-bg": "var(--code-bg)",
    },
    fontFamily: {
      serif: ['"Charter"', '"Source Serif 4"', "Georgia", "serif"],
      sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
    },
    boxShadow: { token: "var(--shadow)" },
  },
},
darkMode: "class",
```

### 4.3 Theme switching

- Class is `dark` on `<html>`, absent for light.
- **No-flash init script**, inlined in `<head>` of `app/layout.tsx`, runs synchronously before paint:
  ```js
  (function () {
    try {
      var t = localStorage.getItem("theme");
      if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
        document.documentElement.classList.add("dark");
      }
    } catch (_) {}
  })();
  ```
- `<ThemeToggle>` button toggles the class, writes `localStorage.theme`, updates its own `aria-label`.

### 4.4 Other tokens

- Border radii: `4px` (citation number chips, badges), `6px` (small interactive — pills), `8px` (cards, inputs, buttons, code blocks).
- Spacing: Tailwind default 4px scale. Container `max-w-5xl mx-auto px-6 py-12` for the page; hero text constrained to `max-w-3xl` for reading width.
- Shadow: single `--shadow` token, applied to cards on hover and to the citation popover.
- Focus ring: `2px solid var(--accent)` with `2px` offset on all interactive elements. Applied via `focus-visible:` Tailwind variant.
- Smooth scroll: `html { scroll-behavior: smooth; }`, disabled under `@media (prefers-reduced-motion: reduce)`.

---

## 5. Layout

### 5.1 Header (sticky, 56px)

Sits above all content, sticky to viewport top. Transparent until scroll, then gains a 1px bottom border and `backdrop-filter: blur(8px) saturate(140%)` for a subtle frosted-glass effect.

Contents (left to right):
- `<a href="/">Harshit Sindhu</a>` — Inter 14px medium, `text-text`.
- Spacer.
- LinkedIn icon link (20×20, opens new tab, `aria-label="LinkedIn profile"`).
- Theme toggle button (sun ↔ moon icon, 20×20, `aria-label="Switch to dark mode"` / `"Switch to light mode"`).

### 5.2 Desktop (≥ 768px)

```
┌──────────────────────────────────────────────────────────────┐
│  Harshit Sindhu                          [linkedin] [☀/☾]    │ 56px sticky
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Ask my work anything.                       (Charter 36px)  │
│  Every claim cites real code, real production               │
│  experience, real artifacts.            (Inter 16px, soft)   │
│                                                              │
│  Try one of these:                          (label, 11px)    │
│  [Built rate limiting?] [Outbox at scale?] [Why TS?] ...     │
│                                                              │
│  ┌────────────────────────────────┐  ┌──────────────────┐    │
│  │ conversation (assistant + user)│  │ SOURCES (sticky) │    │
│  │ scrolls vertically             │  │ [1] snippet card │    │
│  │                                │  │ [2] experience   │    │
│  │                                │  │ [3] github       │    │
│  └────────────────────────────────┘  └──────────────────┘    │
│  [ Ask anything…    ]              [ Ask → ]                 │
│                                                              │
│  ───────────────────────────────────────────────────────     │
│  Built by Harshit Sindhu · LinkedIn · GitHub · LeetCode      │
└──────────────────────────────────────────────────────────────┘
       max-w-5xl, px-6      |   grid: 1fr 320px, gap-8
```

- Container `max-w-5xl mx-auto px-6 py-12`.
- Hero text wrapped in `max-w-3xl` for line-length.
- Chat shell uses `grid grid-cols-[1fr_320px] gap-8`.
- Citations panel `sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto`.
- Input row is in-flow at the bottom of the left column. Submit button shows `Ask →` (Inter medium + arrow icon).

### 5.3 Mobile (< 768px)

Single column. The right rail becomes a `<details>` element labeled `▸ Sources (N)`, closed by default; tapping a `[N]` citation marker auto-opens it and scrolls the matching card into view.

Hover popover suppressed via `@media (hover: hover)` gate on the popover-trigger CSS.

Input row remains in-flow (not fixed-bottom) to avoid virtual-keyboard layout fights on iOS.

### 5.4 States

| State | Behavior |
|---|---|
| Empty (no messages) | Hero + demo prompts visible. Citations panel shows muted hint "Citations will appear here as the answer streams." |
| Streaming | Assistant message renders progressively through `<MarkdownMessage>`. A small pulsing `●` (`animate-pulse` on a small dot) trails the latest content while in-flight. Citation cards appear as SSE `citation` events arrive. |
| Rate-limited (`rate_limited` event) | Status banner appears between conversation and input: amber bar `bg-amber-50 border-amber-200 text-amber-900` (dark: deeper amber via tokens). Dismissible with `×`. |
| Spend-capped (`spend_capped` event) | Same banner pattern, different copy from server. |
| Error (`error` event or fetch failure) | Same banner pattern. |
| Abort / connection lost | Banner shows "Connection lost." |

---

## 6. Components

### 6.1 File map

| File | Action | Notes |
|---|---|---|
| `app/layout.tsx` | modify | Load Inter via `next/font/google`, inline no-flash init script, wrap children with `<Header />` |
| `app/page.tsx` | modify | Refined hero typography. `loadLanding()` from `gray-matter` stays unchanged. Demo prompts handed to `<ChatShell>`. |
| `app/globals.css` | modify | Replace ~5-line stub with ~80 lines: design tokens (light + dark), base resets, focus ring, smooth scroll, `prefers-reduced-motion` overrides |
| `tailwind.config.cjs` | modify | Add `darkMode: "class"`, `theme.extend.colors` aliased to CSS vars, `theme.extend.fontFamily`, register `@tailwindcss/typography` plugin |
| `components/chat-shell.tsx` | modify | Wrap with `<CitationsProvider>`. Replace assistant message `<div>{m.content}</div>` with `<MarkdownMessage content={m.content} />`. Refresh input + button styling. Convert grid to responsive (`grid grid-cols-1 md:grid-cols-[1fr_320px]`). User-turn bubble: right-aligned, `bg-code-bg`, no markdown parsing. |
| `components/citations-panel.tsx` | modify | Adopt the approved card design (number chip + source-type badge + title + meta + chevron toggle). Add `active` state with 1.6s auto-fade. Listen for `citation:focus` events + `scrollIntoView`. Wrap whole panel in `<details>` on mobile via `<MobileSourcesAccordion>` wrapper or a CSS-driven approach. |
| `components/markdown-message.tsx` | create | react-markdown wrapper + citation marker transform (see §7) |
| `components/citation-marker.tsx` | create | hover popover + click-to-scroll + a11y (see §7) |
| `components/shiki-code.tsx` | rename + extend | Was `code-block.tsx`. Dark-aware Shiki theme switching, Copy button on hover/focus, `text-[13px]` body |
| `components/header.tsx` | create | Sticky 56px header with name + LinkedIn + theme toggle |
| `components/theme-toggle.tsx` | create | Sun ↔ moon button, syncs `html` class + `localStorage.theme`, updates own `aria-label` |
| `components/citations-context.tsx` | create | `<CitationsProvider>` + `useCitations()` hook. Holds the `citations` array; lets the marker read citation data for popover preview |
| `app/api/chat/route.ts` | modify | Append markdown-formatting instructions to system prompt (~6 lines, see §7.5) |
| `package.json` | modify | Add `@tailwindcss/typography`, `react-markdown`, `remark-gfm` (~30KB gzipped) |

**Deleted:** `components/code-block.tsx` (replaced by `components/shiki-code.tsx`).

### 6.2 Component interfaces

```ts
// components/citations-context.tsx
interface CitationsContextValue {
  citations: CitationCard[];
  registerCard: (n: number, el: HTMLElement) => void;
  focusCard: (n: number) => void; // scrolls + pulses
}

// components/markdown-message.tsx
interface MarkdownMessageProps { content: string; }

// components/citation-marker.tsx
interface CitationMarkerProps { n: number; }

// components/shiki-code.tsx
interface ShikiCodeProps { code: string; language?: string; }

// components/theme-toggle.tsx
// no props

// components/header.tsx
// no props
```

`CitationsProvider` is a small Context: holds the `citations: CitationCard[]` state and the card-element refs registered by each `CitationsPanel` card on mount. `focusCard(n)` finds the ref, walks up to the nearest `<details>` ancestor and sets `open = true` if present (mobile accordion auto-open), calls `scrollIntoView({ behavior: "smooth", block: "nearest" })`, and toggles a `data-active="true"` attribute on the card for 1.6s.

---

## 7. Markdown + citation rendering

### 7.1 Pipeline

In `chat-shell.tsx`, the conversation map changes:

```tsx
{messages.map((m, i) => (
  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
    {m.role === "user" ? (
      <div className="max-w-[85%] px-4 py-2 rounded-lg bg-code-bg whitespace-pre-wrap text-text">
        {m.content}
      </div>
    ) : (
      <MarkdownMessage content={m.content} />
    )}
  </div>
))}
```

### 7.2 `MarkdownMessage`

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationMarker } from "./citation-marker";
import { ShikiCode } from "./shiki-code";
import { transformCitations } from "./transform-citations";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <article
      aria-label="Assistant answer"
      className="prose prose-neutral dark:prose-invert prose-sm max-w-none
                 prose-p:my-3 prose-pre:my-3 prose-headings:font-serif
                 prose-code:text-text prose-code:bg-code-bg prose-code:rounded
                 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{transformCitations(children)}</p>,
          li: ({ children }) => <li>{transformCitations(children)}</li>,
          code: ({ inline, className, children }) =>
            inline ? (
              <code>{children}</code>
            ) : (
              <ShikiCode
                code={String(children).replace(/\n$/, "")}
                language={className?.replace("language-", "")}
              />
            ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
```

### 7.3 `transformCitations` helper

Walks a React children tree. For each string node, splits on `/\[(\d+)\]/g` matches; emits a `<CitationMarker n={N} />` for each match and keeps the surrounding text. Recurses into non-string children. **Does not transform citations inside `<code>` or `<pre>` nodes** — those are passed through verbatim (regression guard against `[N]` appearing in code samples).

### 7.4 `CitationMarker`

```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useCitations } from "./citations-context";

export function CitationMarker({ n }: { n: number }) {
  const { citations, focusCard } = useCitations();
  const card = citations.find((c) => c.n === n);
  const [hovered, setHovered] = useState(false);
  const timer = useRef<number | null>(null);

  // Suppress hover popover on touch devices via CSS @media (hover: hover).
  // The state is set regardless; the popover is hidden via Tailwind's
  // "hover-none:hidden" custom variant or a media query in the component.

  function onEnter() {
    timer.current = window.setTimeout(() => setHovered(true), 150);
  }
  function onLeave() {
    if (timer.current) clearTimeout(timer.current);
    setHovered(false);
  }
  function onActivate() {
    focusCard(n);
  }

  if (!card) {
    // Citation referenced before its SSE event arrived; render inert.
    return <sup className="text-muted">[{n}]</sup>;
  }

  return (
    <sup className="relative inline-block">
      <button
        type="button"
        onClick={onActivate}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        aria-label={`Citation ${n}, view source ${card.chunk.title ?? card.chunk.filePath ?? "source"}`}
        aria-describedby={hovered ? `cite-pop-${n}` : undefined}
        className="text-[10px] font-medium text-accent bg-accent-bg
                   px-1.5 py-0.5 rounded-[4px] ml-0.5
                   focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-accent"
      >
        {n}
      </button>
      {hovered && (
        <span
          id={`cite-pop-${n}`}
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-10 w-64
                     bg-text text-surface text-xs leading-relaxed
                     rounded-md px-3 py-2 shadow-token
                     pointer-events-none
                     [@media(hover:none)]:hidden"
        >
          <div className="font-medium mb-1">{card.chunk.title ?? card.chunk.filePath}</div>
          <div className="text-muted text-[10px] mb-1.5">
            {card.chunk.sourceType}{card.chunk.sourceProject ? ` · ${card.chunk.sourceProject}` : ""}
          </div>
          <div className="line-clamp-3">{card.chunk.content.slice(0, 140)}…</div>
        </span>
      )}
    </sup>
  );
}
```

### 7.5 Server-side system prompt addition

In `app/api/chat/route.ts`, append to the system prompt assembly:

```
Format your answer in concise GitHub-flavored markdown:
- Bold key terms with **bold**.
- Use fenced code blocks (```ts) for code of 3+ lines.
- Use inline `code` for short identifiers or SQL fragments.
- Do not use H1/H2 headings; use **bold lead-ins** instead.
- Cite sources with [N] markers inline (you already do this — keep doing it).
```

This sits inside the cached prefix of the prompt (per the Phase 4 prompt-caching strategy), so cost impact is one-time.

---

## 8. Testing

### 8.1 Unit (vitest + @testing-library/react)

| File | Asserts |
|---|---|
| `components/markdown-message.test.tsx` | Renders `**bold**` as `<strong>`; fenced ```` ```ts ```` as `<ShikiCode>`; inline `` `x` `` as `<code>`; `[1]` text inside `<p>` becomes `<CitationMarker n={1}>`; `[1]` inside a code block stays literal (regression guard). |
| `components/citation-marker.test.tsx` | Renders `<sup><button>`. Hover after 150ms shows popover (use `vi.useFakeTimers()`); leaving dismisses. Click fires `focusCard(n)` with correct n. Keyboard `Enter` and `Space` activate. When citation is not yet in context, renders inert `<sup>[N]</sup>`. |
| `components/citations-panel.test.tsx` | `focusCard(n)` sets `active` state for 1.6s, calls `scrollIntoView` on the matching card ref. Mobile `<details>` auto-opens when initially closed. |
| `components/theme-toggle.test.tsx` | Click flips `html.dark` class, writes `localStorage.theme`. Initial render respects `prefers-color-scheme` when no `localStorage` value. |
| `components/transform-citations.test.ts` | Pure function — `transformCitations(["See [1] and [2]."])` returns mixed array with two CitationMarker children; doesn't touch nested `<code>` children. |

### 8.2 E2E (Playwright)

`e2e/markdown-render.spec.ts` — Load `/`, click a demo prompt, mock the SSE response with a fixture containing `**bold**`, `[1]`, and a fenced code block; assert:
- The rendered DOM has a `<strong>` element with the bold text.
- The `[1]` is a focusable `<button>` with `aria-label` starting with "Citation 1".
- Clicking the marker scrolls the citation card into view (assert the card's `data-active="true"` attribute).
- A `<code class="hljs">` or equivalent Shiki output exists for the fenced block.

Existing `e2e/recruiter-flow.spec.ts` gets a minor update to query for the new `<MarkdownMessage>` structure instead of the old `whitespace-pre-wrap` div.

### 8.3 Existing tests

All 30 existing vitest tests must remain green (we touch no `lib/` code that they cover).

---

## 9. Accessibility

- Every interactive element (`CitationMarker`, theme toggle, demo prompts, "Show excerpt" toggle, code-block "Copy" button) is a real `<button>`. Keyboard focusable; visible focus rings (2px solid `--accent`, 2px offset) via `focus-visible:` Tailwind variant.
- `<CitationMarker>` has `aria-label="Citation N, view source <title>"` and `aria-describedby={popover-id}` when popover is open.
- Popover is `role="tooltip"` with a stable id `cite-pop-{n}`.
- Mobile `<details>` accordion is native — no JS, no ARIA needed; screen readers handle disclosure correctly.
- `<MarkdownMessage>` wrapped in `<article aria-label="Assistant answer">` so screen readers can navigate by landmark.
- Theme toggle `aria-label` updates with state: "Switch to dark mode" or "Switch to light mode".
- Color contrast: every text/background pair in both themes passes WCAG AA (body ≥ 4.5:1, large text ≥ 3:1). Verified during implementation with a one-off contrast-check script (not committed).
- Code blocks: `role="region" aria-label="Code excerpt, <language>"`.
- Motion: `prefers-reduced-motion: reduce` disables the citation-pulse animation and `scroll-behavior: smooth`.

---

## 10. Risks and open questions

| Risk | Mitigation |
|---|---|
| `react-markdown` re-parses on every streaming token → potential jank on long answers | At the content scale of this site (answers ~300–800 tokens), parsing cost is negligible. If it ever shows up in DevTools as >16ms per token, throttle via `useDeferredValue` or batch tokens before re-rendering. Not addressing pre-emptively. |
| Hand-rolled hover popover misses an edge case (e.g., focus-out during async hover) | Test suite covers the keyboard + mouse paths. If pain emerges, swap to `@radix-ui/react-hover-card` (one-line dep change, ~5-line refactor). |
| Inter font load shifts layout despite `display:swap` | `next/font/google` self-hosts the font and writes a CSS `size-adjust` declaration to match metrics; layout shift should be minimal. If visible CLS appears, switch to `display:optional`. |
| Markdown system-prompt addition changes the model's tone | The addition is purely about formatting; existing instructions about citation use, hedging, and grounding stay intact. We'll spot-check the first 2–3 answers post-deploy and revert if tone drifts. |
| Charter not installed on Windows / Linux → fallback chain triggers | Acceptable. Source Serif 4 from Google Fonts is the cross-platform fallback; Georgia is the universal floor. All three render the editorial feel. |
| `git mv` for code-block.tsx → shiki-code.tsx breaks downstream imports | Mechanical sweep: only one importer (`citations-panel.tsx`). Update during the same commit. |

---

## 11. Acceptance criteria

This phase is complete when:

1. Assistant messages with `**bold**`, `[1]` markers, fenced code blocks, lists, links render as proper formatted HTML (no literal markdown visible).
2. Clicking a `[N]` marker scrolls the right-rail citations panel to card N and pulses it.
3. Hovering a `[N]` marker (desktop only) shows a popover with title + meta + first ~120 chars after 150ms.
4. Theme toggle in the header switches the site between light and dark; choice persists across reloads via `localStorage`; no flash of wrong theme on initial paint.
5. At `<768px` viewport the citations panel collapses into a `<details>` accordion below the conversation.
6. Tab navigation lands on every interactive element with a visible focus ring.
7. `pnpm typecheck` clean, `pnpm test` 35+ tests passing (30 prior + new), `pnpm build` clean.
8. Playwright `markdown-render.spec.ts` passes. Existing e2e specs pass.
9. Manual smoke test: send each of the 5 demo prompts, verify answers render with markdown + clickable citations; toggle theme and verify both look correct; resize browser to ~400px wide and verify accordion behavior.
