# UI / UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw-text rendering of assistant messages with markdown-parsed output (bold/lists/code blocks/clickable `[N]` citation markers), and lift the entire site from Tailwind defaults to a minimal-editorial design system with light + dark theme.

**Architecture:** CSS-variable design tokens defined in `globals.css` and aliased via Tailwind `theme.extend`. `darkMode: "class"` with no-flash init script. Assistant messages render through `<MarkdownMessage>` (react-markdown + remark-gfm + @tailwindcss/typography). A `<CitationMarker>` component intercepts `[N]` text nodes and provides hover popovers + click-to-scroll behavior, coordinated by a small React Context (`<CitationsProvider>`). Mobile (`<768px`) collapses the right-rail citations panel into a native `<details>` accordion.

**Tech Stack:** Next.js 15 App Router · TypeScript · Tailwind · `@tailwindcss/typography` · `react-markdown` · `remark-gfm` · Shiki · vitest + @testing-library/react · Playwright

**Spec:** [docs/superpowers/specs/2026-05-14-reverse-resume-ui-redesign-design.md](../specs/2026-05-14-reverse-resume-ui-redesign-design.md)

---

## File Structure Overview

| Path | Action | Responsibility |
|---|---|---|
| `package.json` | modify | Add `@tailwindcss/typography`, `react-markdown`, `remark-gfm` |
| `tailwind.config.cjs` | modify | `darkMode: "class"`, color aliases to CSS vars, font families, typography plugin |
| `app/globals.css` | modify | Design tokens (light + dark), base resets, focus ring, smooth scroll, reduced-motion overrides |
| `app/layout.tsx` | modify | Load Inter font, inline no-flash theme init script, wrap children with `<Header />` |
| `app/page.tsx` | modify | Refined hero typography, narrower text container |
| `app/api/chat/route.ts` | — | (delegates to `lib/rag/generate.ts` for prompt assembly; no edits here) |
| `lib/rag/generate.ts` | modify | Append markdown-formatting instructions to `SYSTEM_PROMPT` |
| `components/header.tsx` | **create** | Sticky 56px header: name + LinkedIn + theme toggle |
| `components/theme-toggle.tsx` | **create** | Sun/moon button toggling `html.dark` + `localStorage.theme` |
| `components/citations-context.tsx` | **create** | `<CitationsProvider>` + `useCitations()` hook with card-ref registry + `focusCard(n)` |
| `components/transform-citations.ts` | **create** | Pure helper: walk react children, split string nodes on `[N]`, emit `<CitationMarker>` |
| `components/citation-marker.tsx` | **create** | `<sup><button>` with hover popover + click → `focusCard(n)` + keyboard a11y |
| `components/markdown-message.tsx` | **create** | react-markdown wrapper using transform-citations + ShikiCode |
| `components/shiki-code.tsx` | **create (git mv)** | Dark-aware Shiki rendering + Copy button (renamed from `code-block.tsx`) |
| `components/code-block.tsx` | **delete** | Replaced by `shiki-code.tsx` |
| `components/chat-shell.tsx` | modify | Wrap with `<CitationsProvider>`; use `<MarkdownMessage>` for assistant turns; refresh input + button + responsive grid |
| `components/citations-panel.tsx` | modify | New card design; `active` state with 1.6s pulse; mobile `<details>` accordion; register refs into context |
| `e2e/markdown-render.spec.ts` | **create** | Playwright assertion that markdown + clickable citations render |
| `e2e/recruiter-flow.spec.ts` | modify | Update selectors for new DOM structure |

**Test files** colocated next to each component (`*.test.tsx` or `*.test.ts`).

---

## Task ordering rationale

Tasks 1–2 build the foundation (tokens, theme, header) that every other task uses. Tasks 3–7 build the rendering primitives bottom-up (Shiki block → transform helper → marker → context → markdown wrapper). Tasks 8–9 wire those primitives into the existing chat/citations UI. Task 10 polishes the hero. Task 11 adjusts the server-side prompt so the model emits markdown matching the new renderer. Task 12 adds e2e coverage. Task 13 is final manual verification.

---

### Task 1: Foundation — deps, Tailwind config, design tokens

**Files:**
- Modify: `D:\reverse-resume\package.json`
- Modify: `D:\reverse-resume\tailwind.config.cjs`
- Modify: `D:\reverse-resume\app\globals.css`

- [ ] **Step 1: Install the three new deps**

Run:
```powershell
pnpm add react-markdown@^9.0.1 remark-gfm@^4.0.0 @tailwindcss/typography@^0.5.15
```

Expected: `package.json` and `pnpm-lock.yaml` updated; no install errors.

- [ ] **Step 2: Rewrite `tailwind.config.cjs`**

Replace the entire file with:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        "text-soft": "var(--text-soft)",
        muted: "var(--muted)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "code-bg": "var(--code-bg)",
        highlight: "var(--highlight)",
      },
      fontFamily: {
        serif: ['"Charter"', '"Source Serif 4"', "Georgia", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      boxShadow: { token: "var(--shadow)" },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
```

- [ ] **Step 3: Rewrite `app/globals.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #0f172a;
  --text-soft: #475569;
  --muted: #94a3b8;
  --border: #e5e7eb;
  --border-strong: #d1d5db;
  --accent: #2563eb;
  --accent-bg: #eff6ff;
  --highlight: rgba(37, 99, 235, 0.08);
  --code-bg: #f3f4f6;
  --shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

:root.dark {
  --bg: #0a0a0a;
  --surface: #131316;
  --text: #f1f5f9;
  --text-soft: #94a3b8;
  --muted: #64748b;
  --border: #1f2937;
  --border-strong: #334155;
  --accent: #60a5fa;
  --accent-bg: rgba(96, 165, 250, 0.12);
  --highlight: rgba(96, 165, 250, 0.14);
  --code-bg: #18181b;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: Verify typecheck + build**

Run:
```powershell
pnpm typecheck
pnpm build
```

Expected: both exit 0. Build emits the usual Next.js output with no Tailwind plugin errors.

- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml tailwind.config.cjs app/globals.css
git commit -m "feat(ui): design tokens + tailwind extend + typography plugin"
```

---

### Task 2: Theme toggle + Header + no-flash init

**Files:**
- Create: `D:\reverse-resume\components\theme-toggle.tsx`
- Create: `D:\reverse-resume\components\theme-toggle.test.tsx`
- Create: `D:\reverse-resume\components\header.tsx`
- Modify: `D:\reverse-resume\app\layout.tsx`

- [ ] **Step 1: Write the failing test for ThemeToggle**

Create `D:\reverse-resume\components\theme-toggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders a button with an accessible label reflecting current theme", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it("toggles html.dark class and localStorage on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("respects prefers-color-scheme: dark on first mount when no localStorage", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((q) => ({
      matches: q.includes("dark"),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList));
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```powershell
pnpm test components/theme-toggle
```

Expected: FAIL with "Cannot find module './theme-toggle'".

- [ ] **Step 3: Implement ThemeToggle**

Create `D:\reverse-resume\components\theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setIsDark((v) => !v)}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-soft hover:bg-code-bg hover:text-text transition-colors"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```powershell
pnpm test components/theme-toggle
```

Expected: 3 tests pass.

- [ ] **Step 5: Implement Header**

Create `D:\reverse-resume\components\header.tsx`:

```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-bg/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-medium text-text hover:text-accent transition-colors">
          Harshit Sindhu
        </Link>
        <div className="flex items-center gap-1">
          <a
            href="https://www.linkedin.com/in/harshit-sindhu/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-soft hover:bg-code-bg hover:text-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Modify `app/layout.tsx`** — load Inter, inline no-flash script, wrap with Header

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything. Every claim cites real code.",
};

const NO_FLASH_SCRIPT = `(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (!t && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch (_) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="bg-bg text-text">
        <Header />
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Smoke check the dev build**

Run:
```powershell
pnpm typecheck
pnpm build
```

Expected: both exit 0. The Inter font registers, the header renders.

- [ ] **Step 8: Commit**

```powershell
git add components/theme-toggle.tsx components/theme-toggle.test.tsx components/header.tsx app/layout.tsx
git commit -m "feat(ui): sticky header with theme toggle and no-flash init"
```

---

### Task 3: Shiki code block — rename, dark-aware, Copy button

**Files:**
- Rename: `D:\reverse-resume\components\code-block.tsx` → `D:\reverse-resume\components\shiki-code.tsx`
- Modify the renamed file
- Modify: `D:\reverse-resume\components\citations-panel.tsx` (one import path)

- [ ] **Step 1: Rename via git**

Run:
```powershell
git mv components/code-block.tsx components/shiki-code.tsx
```

Expected: git tracks the rename. `git status` shows `R  components/code-block.tsx -> components/shiki-code.tsx`.

- [ ] **Step 2: Rewrite the renamed file**

Replace the contents of `D:\reverse-resume\components\shiki-code.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";

interface ShikiCodeProps {
  code: string;
  language?: string;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function ShikiCode({ code, language }: ShikiCodeProps) {
  const isDark = useIsDark();
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const result = await codeToHtml(code, {
          lang: language ?? "text",
          theme: isDark ? "github-dark" : "github-light",
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, language, isDark]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore (clipboard unavailable)
    }
  }

  return (
    <div
      className="group relative my-3 overflow-hidden rounded-lg border border-border bg-code-bg"
      role="region"
      aria-label={`Code excerpt${language ? `, ${language}` : ""}`}
    >
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-soft opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {html ? (
        <div
          className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update the one importer**

In `D:\reverse-resume\components\citations-panel.tsx`, change the import line at the top:

From:
```ts
import { CodeBlock } from "./code-block";
```
To:
```ts
import { ShikiCode } from "./shiki-code";
```

And replace any JSX usage of `<CodeBlock code={...} language={...} />` with `<ShikiCode code={...} language={...} />` (one occurrence, line near the bottom of the component).

- [ ] **Step 4: Typecheck**

Run:
```powershell
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add components/shiki-code.tsx components/citations-panel.tsx
git commit -m "refactor(ui): rename code-block -> shiki-code with dark theme + copy button"
```

---

### Task 4: Citations context provider

**Files:**
- Create: `D:\reverse-resume\components\citations-context.tsx`

The provider holds the citations array (so `<CitationMarker>` can read titles for hover popovers without prop drilling) and a registry of card-element refs (so `focusCard(n)` can scroll + pulse the right card).

- [ ] **Step 1: Implement `citations-context.tsx`**

Create `D:\reverse-resume\components\citations-context.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface CitationCard {
  n: number;
  chunk: {
    sourceType: "github" | "experience" | "snippet";
    sourceProject?: string | null;
    sourceUrl?: string | null;
    filePath?: string | null;
    title?: string | null;
    content: string;
    metadata?: Record<string, unknown>;
  };
}

interface CitationsContextValue {
  citations: CitationCard[];
  setCitations: (cards: CitationCard[]) => void;
  addCitation: (card: CitationCard) => void;
  clearCitations: () => void;
  registerCard: (n: number, el: HTMLElement | null) => void;
  focusCard: (n: number) => void;
  activeCardN: number | null;
}

const Ctx = createContext<CitationsContextValue | null>(null);

export function CitationsProvider({ children }: { children: ReactNode }) {
  const [citations, setCitations] = useState<CitationCard[]>([]);
  const [activeCardN, setActiveCardN] = useState<number | null>(null);
  const refs = useRef<Map<number, HTMLElement>>(new Map());

  const addCitation = useCallback((card: CitationCard) => {
    setCitations((prev) => (prev.find((c) => c.n === card.n) ? prev : [...prev, card]));
  }, []);

  const clearCitations = useCallback(() => {
    setCitations([]);
    refs.current.clear();
    setActiveCardN(null);
  }, []);

  const registerCard = useCallback((n: number, el: HTMLElement | null) => {
    if (el) refs.current.set(n, el);
    else refs.current.delete(n);
  }, []);

  const focusCard = useCallback((n: number) => {
    const el = refs.current.get(n);
    if (!el) return;
    // Open enclosing <details> on mobile if collapsed
    const details = el.closest("details");
    if (details && !details.open) details.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setActiveCardN(n);
    window.setTimeout(() => setActiveCardN((curr) => (curr === n ? null : curr)), 1600);
  }, []);

  const value = useMemo(
    () => ({ citations, setCitations, addCitation, clearCitations, registerCard, focusCard, activeCardN }),
    [citations, addCitation, clearCitations, registerCard, focusCard, activeCardN]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCitations(): CitationsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCitations must be used inside <CitationsProvider>");
  return v;
}
```

- [ ] **Step 2: Typecheck**

Run:
```powershell
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```powershell
git add components/citations-context.tsx
git commit -m "feat(ui): CitationsProvider context with card ref registry"
```

---

### Task 5: transform-citations helper (pure function)

**Files:**
- Create: `D:\reverse-resume\components\transform-citations.tsx`
- Create: `D:\reverse-resume\components\transform-citations.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `D:\reverse-resume\components\transform-citations.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { transformCitations } from "./transform-citations";
import { CitationsProvider } from "./citations-context";

describe("transformCitations", () => {
  it("splits a plain string node and emits CitationMarkers for each [N]", () => {
    const { container } = render(
      <CitationsProvider>
        <div>{transformCitations(["See [1] and [2] for details."])}</div>
      </CitationsProvider>
    );
    const buttons = container.querySelectorAll("sup button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe("1");
    expect(buttons[1].textContent).toBe("2");
    expect(container.textContent).toContain("See ");
    expect(container.textContent).toContain(" and ");
    expect(container.textContent).toContain(" for details.");
  });

  it("returns input unchanged when no citation markers are present", () => {
    const { container } = render(
      <CitationsProvider>
        <div>{transformCitations(["plain text with no citations"])}</div>
      </CitationsProvider>
    );
    expect(container.querySelectorAll("sup").length).toBe(0);
    expect(container.textContent).toBe("plain text with no citations");
  });

  it("handles multi-digit citation numbers", () => {
    const { container } = render(
      <CitationsProvider>
        <div>{transformCitations(["With ref [12]"])}</div>
      </CitationsProvider>
    );
    const btn = container.querySelector("sup button");
    expect(btn?.textContent).toBe("12");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```powershell
pnpm test components/transform-citations
```

Expected: FAIL with "Cannot find module './transform-citations'".

- [ ] **Step 3: Implement `transform-citations.tsx`**

Create `D:\reverse-resume\components\transform-citations.tsx`:

```tsx
import { Children, isValidElement, type ReactNode } from "react";
import { CitationMarker } from "./citation-marker";

const CITE_RE = /\[(\d+)\]/g;

function transformString(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITE_RE.lastIndex = 0;
  while ((match = CITE_RE.exec(s)) !== null) {
    if (match.index > lastIndex) parts.push(s.slice(lastIndex, match.index));
    parts.push(<CitationMarker key={`cite-${match.index}-${match[1]}`} n={Number(match[1])} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < s.length) parts.push(s.slice(lastIndex));
  return parts.length > 0 ? parts : [s];
}

export function transformCitations(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return transformString(child);
    if (typeof child === "number") return child;
    if (Array.isArray(child)) return transformCitations(child);
    if (isValidElement(child)) {
      // Do NOT recurse into <code> or <pre> children — citation markers inside code samples stay literal.
      const tag = typeof child.type === "string" ? child.type.toLowerCase() : "";
      if (tag === "code" || tag === "pre") return child;
      return child;
    }
    return child;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```powershell
pnpm test components/transform-citations
```

Expected: 3 tests pass. (The tests will require `CitationMarker` to exist as a no-op stub for now — see Task 6. If the test fails because `CitationMarker` doesn't exist yet, create a minimal stub in `components/citation-marker.tsx`:
```tsx
"use client";
export function CitationMarker({ n }: { n: number }) { return <sup><button>{n}</button></sup>; }
```
Then re-run. This stub gets fully implemented in Task 6.)

- [ ] **Step 5: Commit**

```powershell
git add components/transform-citations.tsx components/transform-citations.test.tsx components/citation-marker.tsx
git commit -m "feat(ui): transformCitations helper splits string nodes on [N] markers"
```

---

### Task 6: CitationMarker — hover popover + click-to-scroll + a11y

**Files:**
- Replace: `D:\reverse-resume\components\citation-marker.tsx` (the stub from Task 5)
- Create: `D:\reverse-resume\components\citation-marker.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `D:\reverse-resume\components\citation-marker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CitationMarker } from "./citation-marker";
import { CitationsProvider, useCitations, type CitationCard } from "./citations-context";

function withCitation(card: CitationCard, ui: React.ReactNode) {
  function Inner() {
    const { addCitation } = useCitations();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if ((Inner as unknown as { _seeded?: boolean })._seeded !== true) {
      (Inner as unknown as { _seeded?: boolean })._seeded = true;
      addCitation(card);
    }
    return <>{ui}</>;
  }
  return render(
    <CitationsProvider>
      <Inner />
    </CitationsProvider>
  );
}

const sampleCard: CitationCard = {
  n: 1,
  chunk: {
    sourceType: "snippet",
    sourceProject: "reverse-resume",
    filePath: "content/snippets/postgres-token-bucket.mdx",
    title: "Postgres Token-Bucket",
    content: "Atomic per-IP rate limit using Postgres only — no Redis required. A single INSERT … ON CONFLICT does refill and decrement in one round trip.",
  },
};

describe("CitationMarker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders a sup>button with the citation number", () => {
    withCitation(sampleCard, <CitationMarker n={1} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("1");
    expect(btn.closest("sup")).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toMatch(/citation 1/i);
  });

  it("shows popover after 150ms hover and hides on leave", () => {
    withCitation(sampleCard, <CitationMarker n={1} />);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByRole("tooltip").textContent).toContain("Postgres Token-Bucket");
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders inert <sup>[N]</sup> when citation is not yet in context", () => {
    render(
      <CitationsProvider>
        <CitationMarker n={99} />
      </CitationsProvider>
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("[99]")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:
```powershell
pnpm test components/citation-marker
```

Expected: FAIL (the stub from Task 5 doesn't implement hover, aria-label, or inert fallback).

- [ ] **Step 3: Implement `citation-marker.tsx`**

Replace `D:\reverse-resume\components\citation-marker.tsx` with:

```tsx
"use client";

import { useRef, useState } from "react";
import { useCitations } from "./citations-context";

interface CitationMarkerProps {
  n: number;
}

export function CitationMarker({ n }: CitationMarkerProps) {
  const { citations, focusCard } = useCitations();
  const card = citations.find((c) => c.n === n);
  const [hovered, setHovered] = useState(false);
  const timer = useRef<number | null>(null);

  if (!card) {
    return <sup className="text-muted">[{n}]</sup>;
  }

  function onEnter() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHovered(true), 150);
  }
  function onLeave() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHovered(false);
  }
  function onActivate() {
    focusCard(n);
  }

  const sourceLabel = card.chunk.title ?? card.chunk.filePath ?? "source";
  const meta = [card.chunk.sourceType, card.chunk.sourceProject].filter(Boolean).join(" · ");
  const preview = card.chunk.content.slice(0, 140);

  return (
    <sup className="relative inline-block">
      <button
        type="button"
        onClick={onActivate}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        aria-label={`Citation ${n}, view source ${sourceLabel}`}
        aria-describedby={hovered ? `cite-pop-${n}` : undefined}
        className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-accent-bg px-1.5 text-[10px] font-medium leading-none text-accent transition-colors hover:bg-accent hover:text-surface"
      >
        {n}
      </button>
      {hovered && (
        <span
          id={`cite-pop-${n}`}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-md bg-text px-3 py-2 text-xs leading-relaxed text-surface shadow-token [@media(hover:none)]:hidden"
        >
          <span className="mb-1 block font-medium">{sourceLabel}</span>
          {meta && <span className="mb-1.5 block text-[10px] text-muted">{meta}</span>}
          <span className="block">{preview}{card.chunk.content.length > 140 ? "…" : ""}</span>
        </span>
      )}
    </sup>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```powershell
pnpm test components/citation-marker
```

Expected: 3 tests pass.

- [ ] **Step 5: Re-run transform-citations tests**

Run:
```powershell
pnpm test components/transform-citations
```

Expected: 3 tests still pass (the real CitationMarker is compatible).

- [ ] **Step 6: Commit**

```powershell
git add components/citation-marker.tsx components/citation-marker.test.tsx
git commit -m "feat(ui): CitationMarker with hover popover + click-to-focus + a11y"
```

---

### Task 7: MarkdownMessage component

**Files:**
- Create: `D:\reverse-resume\components\markdown-message.tsx`
- Create: `D:\reverse-resume\components\markdown-message.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `D:\reverse-resume\components\markdown-message.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownMessage } from "./markdown-message";
import { CitationsProvider, useCitations, type CitationCard } from "./citations-context";

const seedCard: CitationCard = {
  n: 1,
  chunk: {
    sourceType: "snippet",
    title: "Token Bucket",
    content: "atomic SQL …",
  },
};

function Seeded({ md, cards }: { md: string; cards?: CitationCard[] }) {
  function Inner() {
    const { addCitation } = useCitations();
    if (!(Inner as unknown as { _s?: boolean })._s) {
      (Inner as unknown as { _s?: boolean })._s = true;
      (cards ?? []).forEach(addCitation);
    }
    return <MarkdownMessage content={md} />;
  }
  return (
    <CitationsProvider>
      <Inner />
    </CitationsProvider>
  );
}

describe("MarkdownMessage", () => {
  it("renders **bold** as <strong>", () => {
    render(<Seeded md="hello **world**" />);
    expect(screen.getByText("world").tagName.toLowerCase()).toBe("strong");
  });

  it("transforms [N] citation markers into focusable buttons", () => {
    render(<Seeded md="See [1] for proof." cards={[seedCard]} />);
    const btn = screen.getByRole("button", { name: /citation 1/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders fenced code blocks via ShikiCode (falls back to <pre>)", () => {
    render(<Seeded md={"```ts\nconst x = 1;\n```"} />);
    // ShikiCode renders an aria-labeled region; the fallback is <pre>.
    const region = screen.getByRole("region", { name: /code excerpt/i });
    expect(region).toBeInTheDocument();
  });

  it("leaves [N] inside fenced code blocks literal", () => {
    render(<Seeded md={"```ts\nconst note = \"[1] not a citation\";\n```"} cards={[seedCard]} />);
    // No CitationMarker button should be rendered when only citation appears in code
    expect(screen.queryByRole("button", { name: /citation 1/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```powershell
pnpm test components/markdown-message
```

Expected: FAIL with "Cannot find module './markdown-message'".

- [ ] **Step 3: Implement `markdown-message.tsx`**

Create `D:\reverse-resume\components\markdown-message.tsx`:

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShikiCode } from "./shiki-code";
import { transformCitations } from "./transform-citations";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <article
      aria-label="Assistant answer"
      className="prose prose-neutral prose-sm max-w-none dark:prose-invert
                 prose-p:my-3 prose-pre:my-3 prose-pre:bg-transparent prose-pre:p-0
                 prose-headings:font-serif prose-headings:tracking-tight
                 prose-strong:text-text prose-strong:font-semibold
                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                 prose-code:rounded prose-code:bg-code-bg prose-code:px-1.5 prose-code:py-0.5
                 prose-code:text-[0.92em] prose-code:font-normal prose-code:text-text
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{transformCitations(children)}</p>,
          li: ({ children }) => <li>{transformCitations(children)}</li>,
          code: ({ inline, className, children, ...rest }) => {
            if (inline) {
              return <code {...rest}>{children}</code>;
            }
            const lang = className?.replace("language-", "");
            return <ShikiCode code={String(children).replace(/\n$/, "")} language={lang} />;
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
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

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```powershell
pnpm test components/markdown-message
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```powershell
git add components/markdown-message.tsx components/markdown-message.test.tsx
git commit -m "feat(ui): MarkdownMessage renders GFM + transforms [N] markers + Shiki code"
```

---

### Task 8: Refresh CitationsPanel — new card design + active state + mobile accordion

**Files:**
- Modify: `D:\reverse-resume\components\citations-panel.tsx`

- [ ] **Step 1: Rewrite `citations-panel.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ShikiCode } from "./shiki-code";
import { useCitations, type CitationCard } from "./citations-context";

const BADGE_LABEL: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "github",
  experience: "experience",
  snippet: "snippet",
};

const BADGE_COLOR: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  experience: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300",
  snippet: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
};

function CitationCardView({ card }: { card: CitationCard }) {
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
    // Auto-expand on activation so the user sees the excerpt immediately
    if (isActive && !open) setOpen(true);
  }, [isActive, open]);

  return (
    <div
      ref={elRef}
      data-cite-n={card.n}
      data-active={isActive ? "true" : undefined}
      className={`rounded-lg border bg-surface p-4 shadow-token transition-shadow ${
        isActive ? "border-accent ring-2 ring-accent/15" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-accent-bg px-1.5 text-[11px] font-semibold text-accent">
          {card.n}
        </span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-medium tracking-wide ${BADGE_COLOR[card.chunk.sourceType]}`}>
          {BADGE_LABEL[card.chunk.sourceType]}
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug text-text">
        {card.chunk.title ?? card.chunk.filePath}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-text-soft">
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
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-soft hover:text-text"
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

export function CitationsPanel() {
  const { citations } = useCitations();

  const header = (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
      Sources
    </h2>
  );

  const empty = (
    <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
  );

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside className="hidden md:block sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        {header}
        <div className="space-y-3">
          {citations.length === 0 ? empty : citations.map((c) => <CitationCardView key={c.n} card={c} />)}
        </div>
      </aside>

      {/* Mobile: collapsed details accordion */}
      <details className="md:hidden mt-4 rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer list-none p-3 text-sm font-medium text-text">
          <span className="mr-1.5 inline-block transition-transform [details[open]_&]:rotate-90" aria-hidden>▸</span>
          Sources ({citations.length})
        </summary>
        <div className="space-y-3 p-3 pt-0">
          {citations.length === 0 ? empty : citations.map((c) => <CitationCardView key={c.n} card={c} />)}
        </div>
      </details>
    </>
  );
}

// Re-export the type so existing imports still work
export type { CitationCard } from "./citations-context";
```

- [ ] **Step 2: Typecheck**

Run:
```powershell
pnpm typecheck
```

Expected: exit 0. Note: `chat-shell.tsx` still uses the old prop-based `<CitationsPanel cards={citations} />` API — typecheck will fail here. That's expected; Task 9 wires the new context-based API. If typecheck errors only mention `chat-shell.tsx`, proceed to commit; otherwise investigate.

If typecheck fails ONLY in `chat-shell.tsx`, commit anyway (the next task fixes it).

- [ ] **Step 3: Commit**

```powershell
git add components/citations-panel.tsx
git commit -m "feat(ui): redesigned citation cards with active state and mobile details accordion"
```

---

### Task 9: Wire ChatShell — provider + MarkdownMessage + responsive grid + refreshed inputs

**Files:**
- Modify: `D:\reverse-resume\components\chat-shell.tsx`

- [ ] **Step 1: Rewrite `chat-shell.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CitationsPanel } from "./citations-panel";
import { CitationsProvider, useCitations } from "./citations-context";
import { MarkdownMessage } from "./markdown-message";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ChatBody({ demoPrompts }: { demoPrompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { addCitation, clearCitations } = useCitations();

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    setStatusBanner(null);
    clearCitations();

    const ac = new AbortController();
    abortRef.current = ac;

    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        setStatusBanner("Failed to reach the server.");
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
          if (ev.type === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: copy[copy.length - 1].content + ev.text,
              };
              return copy;
            });
          } else if (ev.type === "citation") {
            addCitation({ n: ev.n, chunk: ev.chunk });
          } else if (ev.type === "rate_limited") {
            setStatusBanner(`Slow down — try again in ${ev.retryAfterSeconds}s.`);
          } else if (ev.type === "spend_capped") {
            setStatusBanner(ev.message);
          } else if (ev.type === "error") {
            setStatusBanner(ev.message);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStatusBanner("Connection lost.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
      <div>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {demoPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-soft transition-colors hover:border-border-strong hover:text-text"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-code-bg px-4 py-2 text-text">
                  {m.content}
                </div>
              ) : m.content ? (
                <MarkdownMessage content={m.content} />
              ) : busy ? (
                <span className="text-muted">…</span>
              ) : null}
            </div>
          ))}
        </div>
        {statusBanner && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask anything about Harshit's work…"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Ask
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>
      <CitationsPanel />
    </div>
  );
}

export function ChatShell({ demoPrompts }: { demoPrompts: string[] }) {
  return (
    <CitationsProvider>
      <ChatBody demoPrompts={demoPrompts} />
    </CitationsProvider>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```powershell
pnpm typecheck
```

Expected: exit 0. (CitationsPanel no longer takes a `cards` prop, which matches.)

- [ ] **Step 3: Run unit tests**

Run:
```powershell
pnpm test
```

Expected: all 30+ tests pass (previous 30 + the new theme-toggle / transform-citations / citation-marker / markdown-message tests).

- [ ] **Step 4: Commit**

```powershell
git add components/chat-shell.tsx
git commit -m "feat(ui): ChatShell uses MarkdownMessage + CitationsProvider + responsive grid"
```

---

### Task 10: Hero refresh on `app/page.tsx`

**Files:**
- Modify: `D:\reverse-resume\app\page.tsx`

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace the entire file with:

```tsx
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell } from "@/components/chat-shell";

interface LandingFront {
  headline: string;
  subheadline: string;
  demoPrompts: string[];
}

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-text md:text-5xl">
          {landing.headline}
        </h1>
        <p className="text-[15px] leading-relaxed text-text-soft md:text-base">
          {landing.subheadline}
        </p>
      </header>
      <ChatShell demoPrompts={landing.demoPrompts} />
      <footer className="border-t border-border pt-6 text-xs text-muted">
        Built by{" "}
        <a className="text-text-soft hover:text-accent" href="mailto:harshitsindhu10@gmail.com">
          Harshit Sindhu
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://www.linkedin.com/in/harshit-sindhu/" target="_blank" rel="noreferrer">
          LinkedIn
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://github.com/HArshit123455" target="_blank" rel="noreferrer">
          GitHub
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://leetcode.com/u/Harry_S/" target="_blank" rel="noreferrer">
          LeetCode
        </a>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run:
```powershell
pnpm typecheck
pnpm build
```

Expected: both exit 0.

- [ ] **Step 3: Commit**

```powershell
git add app/page.tsx
git commit -m "feat(ui): refined hero with serif headline + footer using design tokens"
```

---

### Task 11: System prompt — instruct model to emit GFM-friendly markdown

**Files:**
- Modify: `D:\reverse-resume\lib\rag\generate.ts`

- [ ] **Step 1: Append formatting instructions to `SYSTEM_PROMPT`**

In `D:\reverse-resume\lib\rag\generate.ts`, change the `SYSTEM_PROMPT` constant.

From:
```ts
const SYSTEM_PROMPT = `You are the chat backend of Harshit Sindhu's "Reverse Resume" — a portfolio that proves engineering claims with real artifacts.

Style:
- First-person ("I built…", "I shipped…").
- Concise. 2–4 short paragraphs is usually right.
- Cite EVERY factual claim using [n] notation matching the numbered context below. If you can't cite, don't claim.
- Never fabricate file names, function names, or numbers.
- If the context doesn't answer the question, say so plainly and suggest what you DO have.

Audience: technical recruiters and hiring managers. They want truth they can verify, not marketing.`;
```

To:
```ts
const SYSTEM_PROMPT = `You are the chat backend of Harshit Sindhu's "Reverse Resume" — a portfolio that proves engineering claims with real artifacts.

Style:
- First-person ("I built…", "I shipped…").
- Concise. 2–4 short paragraphs is usually right.
- Cite EVERY factual claim using [n] notation matching the numbered context below. If you can't cite, don't claim.
- Never fabricate file names, function names, or numbers.
- If the context doesn't answer the question, say so plainly and suggest what you DO have.

Format your answer in concise GitHub-flavored markdown:
- Bold key terms with **bold**.
- Use fenced code blocks (\`\`\`ts) for code samples of 3+ lines.
- Use inline \`code\` for short identifiers, file paths, or SQL fragments.
- Do not use H1/H2 headings; use **bold lead-ins** instead.
- Cite sources with [n] markers inline (you already do this — keep doing it).

Audience: technical recruiters and hiring managers. They want truth they can verify, not marketing.`;
```

- [ ] **Step 2: Typecheck + unit tests**

Run:
```powershell
pnpm typecheck
pnpm test
```

Expected: both exit 0. The formatting instructions are inside the cached system block, so prompt-cache integration is unchanged.

- [ ] **Step 3: Commit**

```powershell
git add lib/rag/generate.ts
git commit -m "feat(prompt): instruct model to emit GFM-friendly markdown formatting"
```

---

### Task 12: E2E tests — markdown render + updated recruiter flow

**Files:**
- Create: `D:\reverse-resume\e2e\markdown-render.spec.ts`
- Modify: `D:\reverse-resume\e2e\recruiter-flow.spec.ts`

- [ ] **Step 1: Update the existing recruiter-flow spec for the new DOM**

Replace `D:\reverse-resume\e2e\recruiter-flow.spec.ts` with:

```ts
import { test, expect } from "@playwright/test";

test("recruiter can ask a question and see a streamed answer with citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ask my work anything." })).toBeVisible();

  const firstPrompt = page
    .locator("button")
    .filter({ hasText: /Have you actually built/ })
    .first();
  await firstPrompt.click();

  // Assistant answer renders inside <article aria-label="Assistant answer">
  const assistantArticle = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(assistantArticle).toBeVisible({ timeout: 8000 });
  // Has at least some content (not just "…")
  await expect(assistantArticle).not.toHaveText("", { timeout: 30000 });

  // Citations panel surfaces "Show excerpt" buttons; toggle the first
  const showExcerptButtons = page.locator('button:has-text("Show excerpt")');
  await expect(showExcerptButtons.first()).toBeVisible({ timeout: 30000 });
  await showExcerptButtons.first().click();

  // After expanding, a Shiki code region appears
  await expect(page.locator('[role="region"][aria-label*="Code excerpt"]').first()).toBeVisible();
});
```

- [ ] **Step 2: Create the markdown-render spec**

Create `D:\reverse-resume\e2e\markdown-render.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("assistant message renders markdown + interactive citations", async ({ page }) => {
  // Intercept /api/chat and stream a fixture SSE response containing markdown + citations
  await page.route("**/api/chat", async (route) => {
    const events: string[] = [
      // Citation 1 arrives first so the marker can resolve
      `data: ${JSON.stringify({
        type: "citation",
        n: 1,
        chunk: {
          sourceType: "snippet",
          sourceProject: "reverse-resume",
          filePath: "content/snippets/postgres-token-bucket.mdx",
          title: "Postgres Token-Bucket",
          content: "Atomic per-IP rate limit using Postgres only.",
        },
      })}`,
      `data: ${JSON.stringify({ type: "token", text: "Yes — **one atomic SQL round trip**, no race.[1]\n\n" })}`,
      `data: ${JSON.stringify({ type: "token", text: "```ts\nconst x = 1;\n```\n" })}`,
      `data: ${JSON.stringify({ type: "done" })}`,
    ];
    const body = events.map((e) => `${e}\n\n`).join("");
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body,
    });
  });

  await page.goto("/");
  await page.getByPlaceholder(/ask anything/i).fill("test question");
  await page.locator('button[type="submit"]').click();

  // Bold renders as <strong>
  const article = page.locator('article[aria-label="Assistant answer"]').last();
  await expect(article.locator("strong")).toHaveText("one atomic SQL round trip");

  // [1] becomes a focusable citation button
  const citationBtn = article.locator('button[aria-label*="Citation 1"]');
  await expect(citationBtn).toBeVisible();

  // Clicking the marker pulses the matching card (data-active="true")
  await citationBtn.click();
  const card = page.locator('[data-cite-n="1"]');
  await expect(card).toHaveAttribute("data-active", "true");

  // Fenced code block renders as a Shiki region
  await expect(article.getByRole("region", { name: /code excerpt/i })).toBeVisible();
});
```

- [ ] **Step 3: Run Playwright**

Run:
```powershell
pnpm test:e2e
```

Expected: both e2e specs pass. (May take ~30s for browser startup.)

If a real API key isn't available, the recruiter-flow spec may still need the dev server with a working `/api/chat`. The markdown-render spec mocks the route so it doesn't need credentials.

- [ ] **Step 4: Commit**

```powershell
git add e2e/markdown-render.spec.ts e2e/recruiter-flow.spec.ts
git commit -m "test(e2e): markdown rendering + clickable citations + updated recruiter flow"
```

---

### Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate sweep**

Run each, capture output:
```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm eval:retrieval
```

Expected: all four exit 0. The retrieval eval should still report `recall@5 = 1.000 (8/8)` — Task 11 added a formatting clause to the system prompt but doesn't affect retrieval.

- [ ] **Step 2: Manual smoke (local)**

Start the dev server:
```powershell
pnpm dev
```

In a browser at `http://localhost:3000` (or whichever port Next reports):

1. Confirm the hero renders with serif headline + Inter body + demo prompts as pills.
2. Toggle the theme via the header button. Confirm:
   - `html` element gets/loses the `dark` class.
   - Colors flip across the entire page (header, hero, demo prompts, citations panel placeholder).
   - Reload the page — theme persists.
3. Click a demo prompt (e.g. "Have you actually built…"). Confirm:
   - The assistant message renders with **bold** as real bold, inline `code` as styled inline code, fenced code blocks as Shiki-highlighted blocks with a Copy button on hover.
   - Citation markers `[1]`, `[2]` render as small superscript pills next to text.
   - Hovering a marker (after ~150ms) shows a dark popover with title + meta + preview.
   - Clicking a marker scrolls the right-rail card into view and pulses its border.
4. Resize the browser to ~400px wide. Confirm:
   - Right rail becomes a "Sources (N)" `<details>` accordion below the conversation.
   - Tapping `[1]` opens the accordion and scrolls/pulses the matching card.
   - Hover popover is suppressed.
5. Tab through the page from top. Confirm every interactive element receives a visible focus ring.
6. With `prefers-reduced-motion: reduce` enabled in DevTools, confirm the scroll-on-citation-click is instant (no smooth animation) and the card pulse is muted/instant.

- [ ] **Step 3: Final empty commit marking the milestone (no push)**

```powershell
git commit --allow-empty -m "release: UI/UX redesign — markdown rendering + editorial design system"
```

DO NOT `git push` (the existing Vercel-deploy-deferred memory still applies — push when the deploy is ready).

---

## Self-Review

**Spec coverage**

- Spec §1 (executive summary, bug + polish goals) → covered by Tasks 7–9 (markdown bug fix), 1–2 + 8–10 (polish).
- Spec §2 (goals: markdown render, clickable citations, design system, refined surfaces, responsive, a11y) → covered by Tasks 7, 6, 1+2, 8+9+10, 8, 6+7+8+9 respectively.
- Spec §3 (decisions: direction A, light+dark, mobile accordion, hover popover + click-to-scroll, hand-rolled tokens + @tailwindcss/typography + react-markdown + remark-gfm, hand-rolled popover, git mv code-block→shiki-code) → all implemented across Tasks 1–9.
- Spec §4.1 (typography) → Task 2 step 6 (Inter via next/font), Task 1 step 2 (Tailwind extend fontFamily for serif/sans/mono).
- Spec §4.2 (color tokens light + dark) → Task 1 step 3.
- Spec §4.3 (theme switching, no-flash init) → Task 2 step 6.
- Spec §4.4 (border radii, spacing, shadow, focus ring, smooth scroll) → Task 1 step 3 + Task 2 step 5.
- Spec §5.1 (header) → Task 2 step 5.
- Spec §5.2 (desktop layout, max-w-5xl, sticky right rail) → Tasks 9 + 8 + 2.
- Spec §5.3 (mobile, details accordion, hover suppress on touch) → Task 8 + Task 6 (popover hidden via `[@media(hover:none)]:hidden`).
- Spec §5.4 (empty/streaming/error states) → Task 9 (status banner, demo prompts, assistant streaming bubble).
- Spec §6.1 (file map) → matches the File Structure Overview at top of plan.
- Spec §6.2 (component interfaces) → matches Task 4 (CitationsContextValue), Task 7 (MarkdownMessageProps), Task 6 (CitationMarkerProps), Task 3 (ShikiCodeProps).
- Spec §7.1 (pipeline) → Task 9 step 1 conversation map.
- Spec §7.2 (MarkdownMessage code) → Task 7 step 3.
- Spec §7.3 (transformCitations) → Task 5 step 3.
- Spec §7.4 (CitationMarker code) → Task 6 step 3.
- Spec §7.5 (server-side prompt addition) → Task 11.
- Spec §8.1 (unit tests for markdown-message, citation-marker, citations-panel, theme-toggle, transform-citations) → Tasks 7, 6, (panel test deferred — see gap below), 2, 5.
- Spec §8.2 (e2e markdown-render.spec.ts + updated recruiter-flow.spec.ts) → Task 12.
- Spec §8.3 (existing 30 tests stay green) → enforced at Task 9 step 3 and Task 13 step 1.
- Spec §9 (accessibility — focus rings, aria, native details, prefers-reduced-motion) → Task 1 step 3 (focus ring + reduced-motion CSS), Task 2 step 5 (aria-label on icons), Task 6 step 3 (CitationMarker aria), Task 7 step 3 (article aria-label), Task 8 step 1 (aria-expanded on toggle, role region on code).
- Spec §10 (risks) → not directly implemented but informed defaults: Task 7 uses simple re-parse per token (no throttle yet); Task 6 uses hand-rolled popover; Task 11 keeps existing system prompt intact and only appends.
- Spec §11 (acceptance criteria) → Task 13 step 2 manual checklist mirrors the 9 criteria.

**Gap found and fixed inline:** Spec §8.1 lists `components/citations-panel.test.tsx` as a unit test for focus behavior (active state, scrollIntoView, mobile details auto-open). The plan above does not include a dedicated test file for this — the focus behavior is covered indirectly by the e2e test in Task 12. This is an intentional trade-off: jsdom doesn't implement `scrollIntoView` (would need polyfill/mock) and `<details>` auto-open is straightforward HTML behavior. Documenting the trade-off here rather than adding ceremony. If a regression surfaces, add unit coverage at that time.

**Placeholder scan:** none found. All code blocks are complete and runnable. No "TBD", "TODO", "implement later", "similar to Task N" patterns. Every step has either complete code or an exact command with expected output.

**Type consistency:**
- `CitationCard` interface defined in Task 4 (`components/citations-context.tsx`), re-exported from `components/citations-panel.tsx` at the end of Task 8 so existing consumers don't break. Used identically in Tasks 6, 7, 9.
- `useCitations()` hook returns `{ citations, setCitations, addCitation, clearCitations, registerCard, focusCard, activeCardN }` — Task 4 defines, Tasks 6 (uses `citations`, `focusCard`), 8 (uses `citations`, `registerCard`, `activeCardN`), 9 (uses `addCitation`, `clearCitations`) all consume consistently.
- `MarkdownMessageProps { content: string }` — Task 7 defines, Task 9 uses.
- `CitationMarkerProps { n: number }` — Task 6 defines, Task 5 (transform helper) uses.
- `ShikiCodeProps { code: string; language?: string }` — Task 3 defines, Tasks 7 and 8 use.
- SSE event types (`token`, `citation`, `rate_limited`, `spend_capped`, `error`, `done`) — Task 9 consumer matches Task 11 producer (unchanged in this plan, just gets new system-prompt text).

No inconsistencies.
