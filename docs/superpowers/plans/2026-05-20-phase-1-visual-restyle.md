# Phase 1 — Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the new warm-paper editorial visual system (Cormorant + Geist + JetBrains Mono, green accent, paper-and-ink palette) onto the existing reverse-resume site without changing any behavior or backend logic. The chat still works exactly as today; only how it looks changes.

**Architecture:** Three layers updated independently — (1) theme strategy switches from `html.dark` class to `html[data-theme="dark"]` attribute (lets us add `data-mode="love"` later without conflict); (2) CSS tokens in `app/globals.css` get a full rewrite to the warm-paper palette with new tokens layered alongside legacy aliases so existing components keep rendering; (3) typography vars wire `next/font` into `--serif`/`--sans`/`--mono` consumed by Tailwind. Surface restyle (header, hero, footer, chat shell, citations panel, markdown message) happens last so each token layer is verified working before the visual changes land.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind 3.4 (CSS-var-driven theme), `next/font/google`, vitest + @testing-library/react, Playwright e2e.

---

## File Structure

**Modify:**
- `app/globals.css` — full rewrite of CSS vars (light, dark, love-mode), keep legacy var names as aliases
- `app/layout.tsx` — add 3 new fonts via `next/font/google`; migrate no-flash script to `data-theme` attribute
- `app/page.tsx` — restyle hero (eyebrow + serif headline with italic accent) and footer (mono line + pill social links)
- `tailwind.config.cjs` — `darkMode: ['selector', '[data-theme="dark"]']`; add new color tokens + keep legacy aliases; add `--serif`/`--sans`/`--mono` font families; add `borderRadius.pill`/`lg`; add new shadows
- `components/header.tsx` — serif italic wordmark with green accent dot, "Full-stack engineer" subtitle, GitLab icon added
- `components/theme-toggle.tsx` — migrate from `classList.toggle("dark")` to `setAttribute("data-theme", ...)`
- `components/theme-toggle.test.tsx` — assert `data-theme` attribute instead of `.dark` class
- `components/chat-shell.tsx` — restyle the input row + chip pills + status banner (no structural changes)
- `components/citations-panel.tsx` — restyle source card + badge colors using new tokens
- `components/markdown-message.tsx` — swap deprecated Tailwind class names (`text-text` → `text-fg`, etc.)

**Create:** none (Phase 1 is purely restyle of existing files)

**Delete:** none

**Test:**
- `components/theme-toggle.test.tsx` (updated assertions, same file)
- All existing tests must continue to pass — no new test files in this phase

---

## Task 1: Migrate theme strategy from class → data-theme attribute

**Files:**
- Modify: `components/theme-toggle.test.tsx`
- Modify: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx:17-24` (the `NO_FLASH_SCRIPT` constant)
- Modify: `tailwind.config.cjs:4` (`darkMode` line)

- [ ] **Step 1: Update theme-toggle test to assert data-theme attribute (RED first)**

Replace the entire body of `components/theme-toggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders a button with an accessible label reflecting current theme", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it("toggles html[data-theme] attribute and localStorage on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
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

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/theme-toggle.test.tsx`
Expected: FAIL with assertion error on `getAttribute("data-theme")` returning `null` (because the component still uses `classList.toggle`)

- [ ] **Step 3: Update theme-toggle.tsx to use data-theme attribute**

Replace the `useEffect` block in `components/theme-toggle.tsx`:

```tsx
useEffect(() => {
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  window.localStorage.setItem("theme", isDark ? "dark" : "light");
}, [isDark]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/theme-toggle.test.tsx`
Expected: PASS — all 3 tests green

- [ ] **Step 5: Update no-flash script in app/layout.tsx**

Replace the `NO_FLASH_SCRIPT` constant (currently at lines 17–24) with:

```ts
const NO_FLASH_SCRIPT = `(function () {
  try {
    var t = localStorage.getItem("theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = t === "dark" || t === "light" ? t : (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {}
})();`;
```

- [ ] **Step 6: Update tailwind darkMode strategy**

In `tailwind.config.cjs`, replace line 4:

```js
  darkMode: ['selector', '[data-theme="dark"]'],
```

- [ ] **Step 7: Run the full test suite to verify nothing else broke**

Run: `pnpm test`
Expected: PASS — all suites green. (Any test that asserts `html.dark` would have failed; current codebase only has theme-toggle.test.tsx checking that, which we just updated.)

- [ ] **Step 8: Manually verify in dev server that the theme toggle still works visually**

Run: `pnpm dev`
Then in browser:
1. Open http://localhost:3000
2. Click the theme toggle
3. Open DevTools → Elements → verify `<html data-theme="dark">` flips to `light` and back
4. Refresh — verify the chosen theme persists
5. Hard refresh in private mode — verify no flash (the inline script should set `data-theme` before paint)

- [ ] **Step 9: Commit**

```bash
git add components/theme-toggle.tsx components/theme-toggle.test.tsx app/layout.tsx tailwind.config.cjs
git commit -m "refactor(theme): migrate theme strategy from .dark class to data-theme attribute

Lets us add html[data-mode='love'] in a later phase without colliding
with the dark-mode selector. Tailwind's selector strategy ([data-theme='dark'])
plus updated no-flash script keeps every existing dark utility working."
```

---

## Task 2: Introduce warm-paper color tokens + new radii/shadows in globals.css

**Files:**
- Modify: `app/globals.css` (full rewrite of `:root` block, add `html[data-theme="dark"]` + `html[data-mode="love"]` blocks)
- Modify: `tailwind.config.cjs` (add new color tokens; keep legacy aliases pointing at the new vars)

- [ ] **Step 1: Replace app/globals.css with the new token system (keeping legacy var names as aliases)**

Overwrite `app/globals.css` entirely with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
html[data-theme="light"] {
  /* Warm paper palette */
  --bg: #f7f5f0;
  --bg-elev: #fbfaf6;
  --bg-sunk: #efece4;
  --fg: #15171a;
  --fg-soft: #2c2f35;
  --muted: #76787e;
  --muted-2: #a8a9ad;
  --border: rgba(20, 23, 26, 0.08);
  --border-strong: rgba(20, 23, 26, 0.14);
  --accent: #1a8f4f;
  --accent-soft: rgba(26, 143, 79, 0.10);
  --accent-ink: #ffffff;

  /* Legacy aliases (delete after Phase 2 migration) */
  --surface: var(--bg-elev);
  --text: var(--fg);
  --text-soft: var(--fg-soft);
  --code-bg: var(--bg-sunk);
  --accent-bg: var(--accent-soft);
  --highlight: var(--accent-soft);

  /* Radii / shadows / motion */
  --radius-sm: 6px;
  --radius: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 0 rgba(20, 23, 26, 0.03);
  --shadow-md: 0 1px 0 rgba(20, 23, 26, 0.03), 0 12px 28px -16px rgba(20, 23, 26, 0.10);
  --shadow: var(--shadow-sm); /* legacy alias */
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
}

html[data-theme="dark"] {
  --bg: #0c0d0f;
  --bg-elev: #131417;
  --bg-sunk: #08090b;
  --fg: #f1efe8;
  --fg-soft: #d2d0c8;
  --muted: #8c8e94;
  --muted-2: #54565d;
  --border: rgba(241, 239, 232, 0.07);
  --border-strong: rgba(241, 239, 232, 0.14);
  --accent: #34d399;
  --accent-soft: rgba(52, 211, 153, 0.12);
  --accent-ink: #0c0d0f;

  --surface: var(--bg-elev);
  --text: var(--fg);
  --text-soft: var(--fg-soft);
  --code-bg: var(--bg-sunk);
  --accent-bg: var(--accent-soft);
  --highlight: var(--accent-soft);

  --shadow-sm: 0 1px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 1px 0 rgba(0, 0, 0, 0.4), 0 18px 40px -22px rgba(0, 0, 0, 0.7);
  --shadow: var(--shadow-sm);
}

/* Love mode (added in Phase 5a; CSS lives here from Phase 1 so it's ready) */
html[data-mode="love"] {
  --accent: #e85d8a;
  --accent-soft: rgba(232, 93, 138, 0.14);
}
html[data-mode="love"][data-theme="dark"] {
  --accent: #f78fb3;
  --accent-soft: rgba(247, 143, 179, 0.14);
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background 320ms var(--ease), color 320ms var(--ease);
}

::selection {
  background: var(--accent);
  color: var(--accent-ink);
}

*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Note: `font-family` on body is omitted intentionally — Task 3 wires it up via `--sans` after we add the next/font import.

- [ ] **Step 2: Update tailwind.config.cjs with new tokens + legacy aliases**

Replace the entire `colors` block and add `borderRadius` / `boxShadow` extensions. The full `tailwind.config.cjs` should be:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // New tokens
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-sunk": "var(--bg-sunk)",
        fg: "var(--fg)",
        "fg-soft": "var(--fg-soft)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        // Legacy aliases (remove in Phase 2)
        surface: "var(--surface)",
        text: "var(--text)",
        "text-soft": "var(--text-soft)",
        "accent-bg": "var(--accent-bg)",
        "code-bg": "var(--code-bg)",
        highlight: "var(--highlight)",
      },
      fontFamily: {
        serif: ['var(--serif)', '"Charter"', '"Source Serif 4"', "Georgia", "serif"],
        sans: ['var(--sans)', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['var(--mono)', "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        token: "var(--shadow)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
```

- [ ] **Step 3: Run typecheck + tests to confirm nothing structural broke**

Run: `pnpm typecheck && pnpm test`
Expected: PASS — no TypeScript errors, all unit tests green.

- [ ] **Step 4: Run dev server and visually verify the old chat page now renders in warm-paper palette**

Run: `pnpm dev`
1. Open http://localhost:3000
2. Confirm: page background is warm cream (`#f7f5f0`), not the previous `#fafafa`
3. Confirm: text reads as near-black with brown-warm undertone, not slate
4. Toggle theme → confirm dark surface is near-black (`#0c0d0f`), accent is mint
5. Open DevTools → manually run `document.documentElement.setAttribute("data-mode", "love")` → confirm accent shifts to rose pink, then `removeAttribute("data-mode")` to revert
6. Existing chat input + chips + sources rail should all still render — only colors shift

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tailwind.config.cjs
git commit -m "feat(theme): warm-paper palette + new radii/shadows + love-mode override

CSS vars rewritten to the editorial token system from the design handoff.
Legacy var names (--surface, --text, --code-bg, etc.) kept as aliases so
existing Tailwind utility classes render unchanged — they'll be cleaned
up in Phase 2 when the chat shell is rebuilt."
```

---

## Task 3: Add Cormorant Garamond, Geist, JetBrains Mono via next/font

**Files:**
- Modify: `app/layout.tsx` (font imports + className composition)
- Modify: `app/globals.css` (wire next/font vars into `--serif`/`--sans`/`--mono`)

- [ ] **Step 1: Update app/layout.tsx to import the three new fonts**

Replace the top of `app/layout.tsx` (imports through `const NO_FLASH_SCRIPT` declaration). Keep everything else intact — only the imports, the font setup, and the `<html className>` attribute change.

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, JetBrains_Mono, Inter } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-geist",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything. Every claim cites real code.",
};
```

Then update the `RootLayout` `<html>` className to compose all four fonts:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = `${cormorant.variable} ${geist.variable} ${jetbrains.variable} ${inter.variable}`;
  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="bg-bg text-fg">
        <Header />
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
```

Note: body className flipped from `bg-bg text-text` to `bg-bg text-fg` (using the new token name; the legacy alias `text-text` would also work but we're starting the migration).

- [ ] **Step 2: Wire next/font vars into globals.css**

Add this block to `app/globals.css` *immediately after* the `html[data-mode="love"][data-theme="dark"]` block (around line 50 of the file after Task 2's edit):

```css
:root {
  --serif: var(--font-cormorant), "Cormorant Garamond", Georgia, serif;
  --sans: var(--font-geist), "Geist", var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --mono: var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
}

body {
  font-family: var(--sans);
}
```

(The earlier `body { font-size, line-height, … }` rule keeps applying; this second `body` rule adds `font-family` only.)

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — `next/font/google` exports `Cormorant_Garamond`, `Geist`, `JetBrains_Mono` so no type errors.

- [ ] **Step 4: Run dev server and verify fonts load**

Run: `pnpm dev`
1. Open http://localhost:3000
2. Open DevTools → Network → filter "Font" → confirm three new `.woff2` files load (cormorant, geist, jetbrains-mono)
3. Body text should now render in Geist (slightly wider letterforms than Inter)
4. Apply `font-serif` to any element via DevTools (e.g. on the `<h1>`) → confirm it renders in Cormorant Garamond
5. Apply `font-mono` to any element → confirm JetBrains Mono

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS — font imports don't touch test paths.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(fonts): add Cormorant Garamond, Geist, JetBrains Mono via next/font

CSS vars --serif/--sans/--mono are now wired through next/font's CSS
variables. Tailwind's font-serif/font-sans/font-mono utility classes pick
them up automatically (config done in Task 2). Inter retained as fallback."
```

---

## Task 4: Restyle Header — serif italic wordmark + accent dot + GitLab icon

**Files:**
- Modify: `components/header.tsx` (full visual rewrite, structure preserved)

- [ ] **Step 1: Rewrite components/header.tsx**

Replace the entire file with:

```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/30 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-6">
        <Link href="/" className="group inline-flex items-baseline gap-0 leading-none" aria-label="Harshit Sindhu — home">
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
        <div className="flex items-center gap-1">
          <a
            href="https://www.linkedin.com/in/harshit-sindhu/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
          <a
            href="https://github.com/HArshit123455"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 0 0-.9-2.1c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.8 0 0-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.1 1.6 4 2 4 2c-.8 2-.3 3.5-.1 3.8A5.1 5.1 0 0 0 2.5 9.3c0 5 3.1 6.3 6 6.6-.4.4-.7.9-.8 1.5L8 22"/>
            </svg>
          </a>
          <a
            href="https://gitlab.com/harshit_sindhu"
            target="_blank"
            rel="noreferrer"
            aria-label="GitLab profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M22.65 14.39 12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.5h8.1l2.44-7.5A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
            </svg>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update ThemeToggle's hover classes to use new tokens**

In `components/theme-toggle.tsx`, the button currently uses `text-text-soft hover:bg-code-bg hover:text-text`. Update to:

```tsx
className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
```

(The legacy aliases would still work, but the visual rhythm changes from `h-8 w-8` to `h-9 w-9` to match the icon buttons in the header.)

- [ ] **Step 3: Run typecheck + unit tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS — theme-toggle test still passes (we didn't change its behavior, only sizing).

- [ ] **Step 4: Run dev server and verify the header**

Run: `pnpm dev`
1. Header reads "harshit●" in italic serif with a green accent dot
2. Subtitle "Full-stack engineer" sits to the right of a thin vertical divider
3. Four icon buttons on the right: LinkedIn, GitHub, GitLab, theme toggle
4. Sticky behavior on scroll: header stays pinned with subtle backdrop blur
5. Toggle theme → green accent shifts to mint, surfaces shift to near-black, header still legible

- [ ] **Step 5: Commit**

```bash
git add components/header.tsx components/theme-toggle.tsx
git commit -m "feat(header): serif wordmark with accent dot + GitLab icon

Replaces the plain sans-serif name with the editorial 'harshit●' wordmark
from the design handoff. Adds GitLab icon alongside LinkedIn/GitHub
(prepares for the GitLab commit graph in Phase 4)."
```

---

## Task 5: Restyle Hero in app/page.tsx — eyebrow + serif headline with italic accent

**Files:**
- Modify: `app/page.tsx` (hero section + footer; chat shell unchanged)
- Modify: `content/landing.mdx` — split headline into a `headlinePre` + `headlineEm` + `headlinePost` for the italic accent split (or do the split inline; we'll do it inline since landing.mdx will be reorganized in Phase 2 anyway)

- [ ] **Step 1: Rewrite the hero block in app/page.tsx**

Replace the `<header>` block (currently lines 21–28) with:

```tsx
<header className="max-w-3xl space-y-7">
  {/* NOTE: eyebrow copy is the design-mock placeholder; user confirms/rewrites in Phase 5b content authoring. */}
  <div className="inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
    <span aria-hidden className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent ring-4 ring-accent-soft animate-[pulse-dot_2.6s_ease-in-out_infinite]" />
    Open to senior/mid full-stack roles · Delhi / Remote
  </div>
  <h1 className="font-serif text-[clamp(48px,8vw,96px)] font-medium leading-[0.94] tracking-[-0.03em] text-fg">
    Ask my work <em className="not-italic font-medium text-accent italic">anything</em>.
  </h1>
  <p className="max-w-[580px] text-[17px] leading-[1.6] text-muted">
    {landing.subheadline}
  </p>
</header>
```

Note: the headline literal is hardcoded here because the original `landing.mdx` headline string doesn't carry the inline `<em>` markup needed for the accent split. The lede still comes from `landing.subheadline`. We'll restructure `landing.mdx` in Phase 2 when audience-aware chips are added.

- [ ] **Step 2: Add the pulse-dot keyframes to app/globals.css**

Append to `app/globals.css` (after the `prefers-reduced-motion` block):

```css
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(0.6); }
}
```

- [ ] **Step 3: Run typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Run dev server + verify the hero**

Run: `pnpm dev`
1. Eyebrow above headline: tiny pulsing green dot + uppercase mono text
2. Headline reads "Ask my work *anything*." in large serif with "anything" in italic accent green
3. Lede paragraph stays in sans-serif, sits below
4. Headline scales fluidly between 48px (mobile) and 96px (desktop)
5. Toggle dark mode → eyebrow text becomes lighter muted, accent shifts to mint
6. Confirm `prefers-reduced-motion: reduce` (in DevTools rendering panel) freezes the dot pulse

- [ ] **Step 5: Run e2e recruiter-flow to confirm existing test still finds the headline**

Run: `pnpm test:e2e e2e/recruiter-flow.spec.ts`
Expected: PASS — the test uses `getByRole("heading", { name: "Ask my work anything." })` and our `<h1>` now renders that exact accessible name (the `<em>` is inline text, so the heading's accessible name is still the full sentence).

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(hero): serif italic-accent headline + pulsing-dot status eyebrow

'Ask my work anything.' now renders in Cormorant Garamond with 'anything'
as the italic green accent. Eyebrow announces availability with a soft
pulsing dot. Existing recruiter-flow e2e stays green."
```

---

## Task 6: Restyle Footer in app/page.tsx — mono line + pill social links

**Files:**
- Modify: `app/page.tsx` (footer block, currently lines 30–47)

- [ ] **Step 1: Rewrite the footer block in app/page.tsx**

Replace the `<footer>` block (currently lines 30–47) with:

```tsx
<footer className="mt-20 grid gap-6 border-t border-border pt-13 pb-11 sm:grid-cols-[1fr_auto] sm:items-center">
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
```

The "⌘K" reference is intentional — the palette ships in Phase 5a; for now it's a forward-looking signal. The shortcut will work once Phase 5a lands.

- [ ] **Step 2: Run typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 3: Run dev server + verify the footer**

Run: `pnpm dev`
1. Scroll to bottom: see mono copyright line + pill-shaped social link buttons
2. "⌘K" text is accent green
3. Hover on a pill: border darkens, text saturates
4. Toggle dark mode → links flip cleanly
5. On viewport < 640px: links wrap to a second row

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(footer): mono copyright + pill-shaped social links

Replaces the inline text-link footer with the editorial pill-button
layout from the design. Hints at the (coming) Cmd-K palette via the
accent-colored '⌘K' phrase."
```

---

## Task 7: Restyle ChatShell + supporting components (last visual pass)

**Files:**
- Modify: `components/chat-shell.tsx` (chip pills, input row, status banner, user bubble shape — structural changes deferred to Phase 2)
- Modify: `components/markdown-message.tsx:14-23` (prose className — swap legacy aliases for new tokens)
- Modify: `components/citations-panel.tsx:13-18` (badge color classes — keep semantic, restyle subtle)

- [ ] **Step 1: Update components/chat-shell.tsx visual classes**

This is purely a CSS-class refresh — the component's logic, state, props, callbacks all stay identical. Apply these specific replacements:

Find the chip button (around line 108):
```tsx
className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-soft transition-colors hover:border-border-strong hover:text-text"
```
Replace with:
```tsx
className="inline-flex items-center gap-2 rounded-pill border border-transparent bg-bg-sunk px-3.5 py-2 text-[13.5px] text-fg-soft transition-colors hover:border-border-strong hover:bg-bg-elev hover:text-fg"
```

Find the section label (around line 100):
```tsx
className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
```
Replace with:
```tsx
className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2"
```

Find the user bubble (around line 120):
```tsx
className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-code-bg px-4 py-2 text-text"
```
Replace with:
```tsx
className="max-w-[78%] whitespace-pre-wrap rounded-[20px_20px_6px_20px] border border-border bg-bg-sunk px-5 py-3 text-[15px] font-medium leading-[1.45] text-fg"
```

Find the input field (around line 151):
```tsx
className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
```
Replace with:
```tsx
className="flex-1 rounded-[16px] border border-border bg-bg-elev px-5 py-[18px] text-[15.5px] text-fg placeholder:text-muted-2 transition-all focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
```

Find the Ask button (around line 159):
```tsx
className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
```
Replace with:
```tsx
className="inline-flex items-center gap-2.5 rounded-[16px] bg-fg px-6 py-[18px] text-[14.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
```

Find the status banner (around line 132):
```tsx
className="mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
```
Leave the amber palette alone (it's a status color, not part of the design system); just change the border-radius and spacing:
```tsx
className="mt-4 flex items-center justify-between rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
```

- [ ] **Step 2: Update components/markdown-message.tsx prose classes**

In `components/markdown-message.tsx`, replace the `className` attr on the `<article>` (lines 16–23):

```tsx
className="prose prose-neutral prose-sm max-w-none dark:prose-invert
           prose-p:my-3 prose-pre:my-3 prose-pre:bg-transparent prose-pre:p-0
           prose-headings:font-serif prose-headings:tracking-tight
           prose-strong:text-fg prose-strong:font-semibold
           prose-a:text-accent prose-a:no-underline hover:prose-a:underline
           prose-code:rounded prose-code:bg-bg-sunk prose-code:px-1.5 prose-code:py-0.5
           prose-code:text-[0.92em] prose-code:font-normal prose-code:text-fg
           prose-code:before:content-none prose-code:after:content-none"
```

(Three swaps: `text-text` → `text-fg` x2, `bg-code-bg` → `bg-bg-sunk`.)

- [ ] **Step 3: Update components/citations-panel.tsx visual classes**

The component's logic is fine; only restyle. Apply these specific replacements in `components/citations-panel.tsx`:

Find the source card (around line 41–43):
```tsx
className={`rounded-lg border bg-surface p-4 shadow-token transition-shadow ${
  isActive ? "border-accent ring-2 ring-accent/15" : "border-border"
}`}
```
Replace with:
```tsx
className={`rounded-[12px] border bg-bg-elev p-4 transition-all hover:border-border-strong ${
  isActive ? "border-accent ring-2 ring-accent/15 shadow-md" : "border-border"
}`}
```

Find the citation number badge (around line 47):
```tsx
className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-accent-bg px-1.5 text-[11px] font-semibold text-accent"
```
Replace with:
```tsx
className="inline-flex h-5 min-w-[22px] items-center justify-center rounded font-mono bg-accent-soft px-1.5 text-[10.5px] font-medium text-accent"
```

Find the title text (around line 53):
```tsx
className="text-sm font-semibold leading-snug text-text"
```
Replace with:
```tsx
className="text-[13.5px] font-semibold leading-snug tracking-[-0.005em] text-fg"
```

Find the meta row (around line 56):
```tsx
className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-text-soft"
```
Replace with:
```tsx
className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted"
```

Find the "Show excerpt" button (around line 74):
```tsx
className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-soft hover:text-text"
```
Replace with:
```tsx
className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg transition-colors"
```

- [ ] **Step 4: Run typecheck + all unit tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS — all unit tests green. (No assertion in any test cares about the specific Tailwind class strings we changed.)

- [ ] **Step 5: Run all e2e tests**

Run: `pnpm test:e2e`
Expected: PASS on both `markdown-render.spec.ts` and `recruiter-flow.spec.ts`. The assertions use accessibility roles + text content + data attributes (e.g. `data-cite-n`, `data-active`, `role="region"`, placeholder text containing "ask anything"), none of which we changed.

- [ ] **Step 6: Manual dev-server smoke check (full UX pass)**

Run: `pnpm dev`

Verify in this order:
1. **Empty state, light mode** — chip pills are softer (warm cream background, larger), input row is taller (62px), Ask button is dark-on-light with new sharp corners
2. **Theme toggle** — flips to dark, accent shifts to mint, all surfaces stay legible
3. **Send a question** — answer streams, citations appear in the right rail with new card style (warm-elevated background, tag badge, monospace path, smaller "Show excerpt" link)
4. **Click a citation marker `[1]` in the answer** — corresponding source card highlights with accent ring + shadow
5. **Expand "Show excerpt"** on a card — Shiki code block renders inside
6. **Manually flip love mode in DevTools console:** `document.documentElement.setAttribute("data-mode", "love")` — every accent (chip hover, citation badge, citation marker, footer "⌘K" text, hero "anything") shifts to rose pink. Run `document.documentElement.removeAttribute("data-mode")` to revert.
7. **Resize to mobile width** — header collapses to 4 icons + brand wordmark (might overflow on very narrow widths; that's acceptable for Phase 1, restructured in a later phase if needed); citations panel collapses to the bottom accordion as before
8. **prefers-reduced-motion** — enable in DevTools Rendering panel → hero dot stops pulsing, transitions are instant

- [ ] **Step 7: Final commit**

```bash
git add components/chat-shell.tsx components/markdown-message.tsx components/citations-panel.tsx
git commit -m "feat(ui): apply editorial restyle across chat surfaces (Phase 1 complete)

Chip pills, input row, user bubble, status banner, source cards, prose
all use the new warm-paper tokens. No structural changes — chat logic,
SSE handling, citations context untouched. Phase 1 ships."
```

---

## Verification Checklist (run before declaring Phase 1 done)

- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm test` → all suites PASS
- [ ] `pnpm test:e2e` → both specs PASS
- [ ] `pnpm build` → builds successfully (catches any Tailwind class typos via missing-class warnings)
- [ ] Manual dev-server smoke: light mode, dark mode, theme toggle, send-a-question flow, citation expand, love-mode DevTools toggle
- [ ] No console errors in browser DevTools on initial load or during chat interaction
- [ ] No FOUC (flash-of-unstyled-content) on hard refresh in dark mode
