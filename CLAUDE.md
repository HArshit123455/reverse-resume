# Reverse Resume: project conventions

Harshit's portfolio. A visitor asks, and a citation-grounded RAG chat answers from his real code, sanitized snippets and experience write-ups. `PRODUCT.md` holds the product facts, `DESIGN.md` the visual system ("The Keynote Stage"), and `.impeccable/surfaces/app-page-tsx.md` the direction contract. Read them before UI work.

## Project notes (Obsidian vault at `~/brain`, this project under `reverse-resume/`)
The readable record for Harshit and Claude, outside this repo: `Now.md` (where things stand), `Decisions.md` (dated, with the why), `Feedback.md` (who said what, what changed), `Releases.md` (every deploy and every ingest), `Runbooks.md` (how things are done, and the traps), `Ideas.md`, `Reference.md`. At the vault root, `Harshit/Inbox.md` is his; lines starting `reverse-resume:` are for this project. At the start of a session read `~/brain/reverse-resume/Now.md` and `~/brain/Harshit/Inbox.md`. After every deploy or ingest add the row to `Releases.md`; when a decision is made or feedback arrives, add it to `Decisions.md` or `Feedback.md` the same day; rewrite `Now.md` before the session ends. Plain sentences, dates, reasons; people by role.

## Hard rules
- **Ask before anything that spends money**: a chat question, `pnpm ingest`, `pnpm eval:retrieval`, the e2e tests. Say what runs and roughly what it costs.
- **`.env.local` points at the production database.** Local chat use and ingests land in prod.
- **Work code appears only as short sanitized excerpts** (30 lines at most, generic names, no org names, ids or secrets). Claim only what his commits show.
- **The Chrysa repo is private**: never link it or show Expo/EAS ids on the site; a test enforces this. No tester names or their data.
- **Never commit research notes**: `.impeccable/*dossier*.md` and `.impeccable/review/` are git-ignored on purpose.

## Commands
`pnpm dev` · `pnpm typecheck && pnpm lint` · `pnpm vitest run --exclude "**/*db*" --exclude "lib/spend-cap/**" --exclude "lib/rate-limit/**"` (the rest need Docker) · `pnpm ingest snippets` (paid, ask first) · deploy is a push to main (Vercel). Don't run `pnpm build` while `pnpm dev` is running: it overwrites `.next` and breaks the dev server.
