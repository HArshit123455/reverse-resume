# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Recruiters and hiring managers** skim fast. They want proof that Harshit can do the job, then they contact him or download the résumé.
- **Engineers evaluating him** (tech leads, interview loops) go deep. They read code citations in the chat, open project write-ups and read long-form case studies such as the Chrysa page.

## Product Purpose

Reverse Resume is Harshit Sindhu's portfolio. It inverts the résumé: the visitor types what they need, and a streaming, citation-grounded RAG chat answers from his real code, sanitized snippets and experience write-ups. Success means the visitor leaves with verified evidence rather than claims, then gets in touch.

## Positioning

Every claim cites something real: code, production experience or an artifact. Hallucinated citations are dropped before they render. The site demonstrates the skills it claims, including RAG design, streaming LLM UX, Postgres-only rate limiting and a spend cap.

## Operating Context

- `/` (home): the chat is the hero ("Ask my work anything"). It has audience-aware suggestion chips (curious / recruiter / engineer), answers with Impact / Code / Story tabs, a sources rail, a projects section with a GitLab activity graph, and a "now" strip.
- `/about`: a facts page for people who don't want to chat. It has a hero, stats, a work and education timeline, skills, achievements and a CTA.
- `/chrysa` (new): a long-form, blog-style case study of Chrysa, Harshit's life-companion mobile app, written for someone who wants to read in detail. It covers what Chrysa is, why it exists and how it was designed and built.
- Chrome: header, ⌘K command palette, easter eggs, light/dark theme toggle and footer.

## Capabilities and Constraints

- Next.js 15 App Router, React 19, Tailwind v3, Postgres (Neon) + pgvector via Drizzle, Anthropic + Voyage APIs.
- Content is authored as MDX/frontmatter in `content/` and loaded through zod-validated loaders. There is no CMS.
- Chat calls paid APIs with a per-IP rate limit and a daily INR spend cap.
- Keep the home route's initial JS lean, and lazy-load heavy visuals.
- Chat is the home centrepiece and must stay the hero through any redesign.

## Brand Commitments

- Name: "Reverse Resume". Tagline: "Ask my work anything."
- Voice: plain, verifiable, no marketing ("No marketing — just verifiable evidence").
- Real company and school logos live in `public/logos/`, and the résumé is at `public/resume.pdf`.

## Evidence on Hand

- `content/about.mdx`, `content/experience/*.mdx`, `content/projects/*.mdx`, `content/snippets/*.mdx`, `content/now.mdx`, `content/landing.mdx`.
- Chrysa material is in `~/chrysa` (repo, `DESIGN.md`, `PRODUCT.md`, `store/`) and `~/brain/chrysa` (Decisions, Feedback, Releases). The Chrysa repo is **private**: the Chrysa page tells the full story but includes **no source code** from it.
- No testimonials, user counts or metrics beyond what these files state. Never invent them.

## Product Principles

1. Evidence over claims: every statement should point at something real.
2. Serve the skimmer and the deep reader on the same page. Give the fast path first and depth on demand.
3. The chat is the product; everything else supports it or offers a way around it.
4. Stay honest about scope: say what is shipped and what is in progress.

## Accessibility & Inclusion

WCAG AA contrast in both themes, keyboard-operable controls with visible focus, and `prefers-reduced-motion` honored (established in earlier specs).
