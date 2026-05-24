# Phase 5b — Content Edit Reference

> **No code in this phase.** All ten items below are text edits in MDX or TS files. Each item lists the file, the location, the current value, and what to change. Land as one or many commits — your call. Build gate is still `pnpm typecheck && pnpm build` afterward.

---

## 1. Real résumé PDF

**File:** [public/resume.pdf](../../../public/resume.pdf)
**Current:** 652-byte placeholder PDF saying "Resume coming soon. See harshit.sh for the current copy."
**Change:** Overwrite with your actual résumé. The palette's "Download résumé (R)" already points at `/resume.pdf` — no code change needed.
**Verify:** open `http://localhost:3000/resume.pdf` in a browser, confirm the real PDF renders.

---

## 2. Audience VOICE_INSTRUCTIONS

**File:** [lib/rag/generate.ts](../../../lib/rag/generate.ts)
**Where:** `VOICE_INSTRUCTIONS` const (prepended to system prompt before retrieval-augmented chunks).
**Spec target:** ~80 words per audience. Spec wording cues:

| Audience    | Voice                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `curious`   | plain English, no jargon, narrative-led. Lead with the human "why".                            |
| `recruiter` | lead with quantified outcomes, business impact, scope (team size, scale, money).               |
| `engineer`  | lead with code, tradeoffs, design decisions. Mention specific files and patterns from chunks.  |

**Verify:** ask a recruiter-mode question on `/`, confirm the first sentence opens with a number or scope claim. Engineer-mode answer should reference at least one filename from the cited chunks. Curious mode should stay below Flesch–Kincaid grade ~10.

---

## 3. Audience-keyed suggestion chips

**File:** [content/landing.mdx](../../../content/landing.mdx)
**Current:** flat `suggestionChips` array (legacy from Phase 2 default).
**Change:** restructure frontmatter to:

```yaml
suggestionChips:
  curious:
    - "How did you end up building this site?"
    - "What's one project you're proudest of?"
    - "..."  # 5 total
  recruiter:
    - "What's the biggest team you've shipped with?"
    - "Show me a project that hit production scale."
    - "..."  # 5 total
  engineer:
    - "Walk me through your RAG retrieval pipeline."
    - "How do you handle citation parsing?"
    - "..."  # 5 total
```

5 prompts per audience. Pull from what's actually indexed — check `content/experience/*.mdx` and `content/projects/*.mdx` for real surface area.
**Verify:** switch audience pill on the hero, confirm chip set swaps and each chip returns a non-empty answer.

---

## 4. Audience-pill blurbs

**File:** [components/chat/audience-pills.tsx](../../../components/chat/audience-pills.tsx)
**Where:** `OPTIONS` const at the top.
**Current:**

```ts
{ value: "curious",   label: "Curious",   blurb: "Tell me a story" },
{ value: "recruiter", label: "Recruiter", blurb: "Show me outcomes" },
{ value: "engineer",  label: "Engineer",  blurb: "Show me code" },
```

**Change:** spec asks ≤8 words each. Current drafts are fine; rewrite if you want sharper voice.

---

## 5. Brand-click hint copy

**File:** [components/eggs/use-logo-click-counter.ts](../../../components/eggs/use-logo-click-counter.ts)
**Where:** `BRAND_CLICK_HINTS` const.
**Current drafts:**

```ts
5:  "You found the easter egg track. Keep going."
10: "Persistent. There's one more."
15: "Try ⌘K — the good stuff's in there."
```

**Change:** rewrite to your voice. Constraint: each fits a 3.2s toast (~50 chars feels right).

---

## 6. Hidden joke pool + credits

**File:** [components/chrome.tsx](../../../components/chrome.tsx)
**Where:** `HIDDEN_JOKES` array (3 drafts) and `HIDDEN_CREDITS` string near the top of the file.
**Triggers:** "Tell me a joke" and "Roll the credits" in the palette's Hidden section (search "joke" / "credits" to reveal).
**Change:** replace jokes with your own; the credits line is a single sentence — keep it warm.

---

## 7. Hero / header / footer copy review

| Field            | File                                                                              | Current                                                                  |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Hero eyebrow     | [components/hero.tsx](../../../components/hero.tsx)                               | "Open to senior/mid full-stack roles · Delhi / Remote"                   |
| Brand subtitle   | [components/header.tsx](../../../components/header.tsx)                           | "Full-stack engineer"                                                    |
| Footer mono line | [components/footer.tsx](../../../components/footer.tsx)                           | "Built in TypeScript, deployed on a Tuesday"                             |
| Headline + lede  | [content/landing.mdx](../../../content/landing.mdx) (`headline`, `subheadline`)   | "Ask my work anything." + the existing subheadline                       |

Review each, rewrite anything that doesn't ring true.

---

## 8. Project entries

**Dir:** [content/projects/](../../../content/projects/)
**Current seeds:** `reverse-resume.mdx`, `sla-engine.mdx`, `outbox-dispatcher.mdx`, `pro-shop.mdx`
**Schema:** `title`, `slug`, `year`, `kind` (`Side project` | `OSS` | `Bootstrapped` | `Experiment`), `status` (`live` | `archived`), `description`, `tags`, `stats: [{label, val}]`, `url?`, `order?`
**Change:**
- Review the 4 seed entries — descriptions and stats are placeholder-ish.
- Add 1–2 more if you want a 5- or 6-card grid (spec allows 4–6).
- Sort: `year desc, order asc` — set `order: 1..N` within a year to break ties.
**Verify:** `loadProjects()` in [lib/content/projects.ts](../../../lib/content/projects.ts) validates frontmatter via zod — bad frontmatter fails the build, not silently.

---

## 9. Now strip

**File:** [content/now.mdx](../../../content/now.mdx)
**Schema:** `updated: "YYYY-MM-DD"`, `items: [{ kind, title, desc }]` where `kind ∈ Building | Reading | Learning | Listening` (these are the four card labels — keep all four).
**Current state (post AWS swap):**
- Building: Reverse Resume
- Reading: Designing Data-Intensive Apps
- Learning: AWS, hands-on
- Listening: Signals & Threads
**Change:** swap any item that no longer reflects what you're into. Bump `updated` to the current date when you do. Spec says "replaced quarterly" — so honest > evergreen.

---

## 10. OG image + meta tags

**File:** [app/layout.tsx](../../../app/layout.tsx)
**Where:** the `metadata` export near the top.
**Current:**

```ts
export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything. Every claim cites real code.",
};
```

**Change (optional):** add OG / Twitter card metadata for richer share previews. To generate a dynamic OG image, create `app/opengraph-image.tsx` per [Next.js OG image conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image). Static `.png` at `app/opengraph-image.png` also works.

---

## After editing

```bash
pnpm typecheck && pnpm build
```

Project loaders (`lib/content/projects.ts`, `lib/content/now.ts`) validate frontmatter via zod, so MDX shape errors surface at build time, not at runtime. If the build is green, the content is shape-valid.
