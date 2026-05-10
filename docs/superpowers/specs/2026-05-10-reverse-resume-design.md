# Reverse Resume — Design Spec

**Author:** Harshit Sindhu
**Date:** 2026-05-10
**Status:** Design approved, awaiting implementation plan

---

## 1. Executive Summary

Reverse Resume is a portfolio site that inverts the traditional resume model. Instead of the candidate listing claims, the recruiter types a need ("we need someone who's scaled a NestJS API to 10k QPS") and a streaming, citation-backed chat answers the question by retrieving from the candidate's actual code, sanitized snippets, and curated experience entries.

It is built as a single Next.js full-stack application backed by Postgres + pgvector, with Claude Sonnet 4.6 generating the answer, Claude Haiku 4.5 doing cheap query rewriting and ingest summarization, and Voyage AI providing embeddings and reranking. Cost is bounded by per-IP rate limits and a daily INR spend cap, both implemented in Postgres with no extra infrastructure.

The differentiator vs "ChatGPT with my repos": every claim is rendered with a Perplexity-style sidebar of citation cards linking to real code, real PRs, and real professional experience. Recruiters can verify, not just trust.

---

## 2. Goals & Non-Goals

### Goals

- **Recruiter-first UX**: zero friction (no signup), clear citations, fast first token (≤ 4s cold).
- **Truthful output**: every factual claim cites a real source. Hallucinated citations are dropped before render.
- **Senior-engineering signal**: the site itself demonstrates the skills it claims — production rate limiting, streaming LLM UX, RAG pipeline design, Postgres-only infra.
- **Operable on a portfolio budget**: hard daily cost ceiling (₹200/day default), abuse-resistant, free to host on Vercel + Neon free tiers initially.
- **Authorable in Markdown**: experience entries and sanitized snippet cards are MDX files committed to the repo. No CMS.

### Non-Goals (v1)

- No user accounts, login, or saved conversations.
- No production load (a portfolio site does not need 10k QPS itself).
- No multi-language support beyond English.
- No mobile app — responsive web is enough.
- No analytics on which questions recruiters ask (privacy + scope).
- No editing UI for content — author MDX in your editor, push to git, ingest fires.

---

## 3. Architecture Overview

```
Recruiter browser ─────► Vercel (Next.js App Router)
                              │
        ┌─── / ────────────── landing + chat UI (RSC + streaming)
        ├─── /api/chat ────── streaming route handler
        └─── /api/admin ───── ingest trigger + stats (token-gated)
                              │
                              ▼
   ┌──────────── Chat pipeline (per request) ────────────┐
   │ 1. IP rate-limit check     (Postgres token bucket)   │
   │ 2. Daily spend-cap check    (halt if ₹ cap hit)      │
   │ 3. Query rewrite           (Haiku 4.5, cheap)        │
   │ 4. Embed query             (Voyage voyage-3)         │
   │ 5. pgvector search          (cosine, top 20)         │
   │ 6. Re-rank                  (Voyage rerank-2, top 5) │
   │ 7. Stream answer            (Sonnet 4.6 + caching)   │
   │ 8. Parse citations, persist (conversation + usage)   │
   └──────────────────────────────────────────────────────┘

   ┌──── Ingest pipeline (cron + manual trigger) ─────────┐
   │ Source A: Public GitHub (job-mcp, others)            │
   │ Source B: Hand-written experience MDX                │
   │ Source C: Sanitized snippet cards MDX (auth/insights)│
   └──────────────────────────────────────────────────────┘

Storage (Neon Postgres):
  documents      (id, source_type, source_url, file_path,
                  content, metadata jsonb, embedding vector(1024))
  conversations  (id, ip_hash, started_at)
  messages       (id, conversation_id, role, content,
                  tokens_in, tokens_out, citations jsonb)
  rate_limits    (ip_hash, bucket_tokens, last_refill)
  spend_tracking (date_ist, cents_spent)
```

### Tech Stack (locked)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router | Single deployable, server actions for streaming, cleanest serverless story |
| Hosting | Vercel | Free tier covers v1; edge-friendly; matches Next.js |
| DB | Neon Postgres + pgvector | Free tier; serverless; pgvector for embeddings |
| ORM | Drizzle | Type-safe schema-first, best-in-class pgvector support |
| Generation LLM | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Recruiter-facing answers; supports prompt caching |
| Cheap LLM | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | Query rewriting + ingest summarization |
| Embeddings | Voyage `voyage-3` (text), `voyage-code` (code) | Anthropic-recommended; 1024-dim |
| Reranker | Voyage `rerank-2` | Lifts retrieval recall by ~15% |
| Code chunking | tree-sitter | Symbol-aware splitting; falls back to sliding window |
| Markdown chunking | unified/remark, h2-boundary | Front-matter aware |
| Syntax highlighting | Shiki (server-rendered) | Best output, no client JS |
| Logging | pino (JSON) → Vercel logs | Cheap, structured, searchable |

---

## 4. Components

### Frontend (`/app`)

- **`/` (RSC)** — landing hero, demo prompt chips (loaded from `/content/landing.mdx`), `<ChatShell />`.
- **`<ChatShell />` (client, ~150 lines)** — message list + input + `<CitationsPanel />`. Calls `/api/chat` via streaming fetch; parses SSE event types (`token`, `citation`, `done`, `error`, `rate_limited`, `spend_capped`).
- **`<CitationsPanel />` (client, ~80 lines)** — renders citation cards. Per-card: source-type badge (`github` / `experience` / `snippet`), title, syntax-highlighted excerpt (Shiki), "View on GitHub" link only when `source_type === "github"`.

### API layer (`/app/api`)

- **`/api/chat/route.ts`** — POST `{messages, conversationId?}` → SSE stream. Composes `RateLimit → SpendCap → RagPipeline → stream`. ~120 lines.
- **`/api/admin/ingest/route.ts`** — token-gated POST `{source: "github"|"experience"|"snippets", target?}` → triggers corpus refresh.
- **`/api/admin/stats/route.ts`** — token-gated GET → JSON of last-24h queries, retrievals, spend state.

### Core library (`/lib`)

| Module | Public function | Notes |
|---|---|---|
| `rag/retrieve.ts` | `retrieve(query, k?)` | Embed → pgvector search → optional rerank. Pure given DB + Voyage clients. |
| `rag/generate.ts` | `generate(messages, chunks, abortSignal)` | Builds Sonnet 4.6 request with prompt caching; yields `token` and `citation` events. |
| `rag/rewrite.ts` | `rewriteQuery(messages)` | Haiku 4.5 query expansion, ~50 tokens out. |
| `rate-limit/postgres-token-bucket.ts` | `consume(ipHash, cost)` | One atomic SQL statement. ~30 SQL + 40 TS. |
| `spend-cap/daily-cap.ts` | `recordSpend(cents)`, `checkCap()` | Integer math. Resets at IST midnight. |
| `ingest/github.ts` | `ingestRepo(owner, name)` | Tree-sitter chunk → Haiku summary → Voyage embed → upsert. Idempotent via content_hash. |
| `ingest/mdx.ts` | `ingestMdx(dir)` | Front-matter aware, h2-boundary chunking. |
| `db/` | Drizzle schema + typed queries | One file per table. |

### Authoring surface (your job)

- `/content/landing.mdx` — hero + demo prompts.
- `/content/experience/*.mdx` — one file per role/project. Front-matter: `{title, role, dates, stack, themes}`.
- `/content/snippets/*.mdx` — one file per recruiter-FAQ topic. Front-matter: `{topic, source_project, language, tags}`.

---

## 5. Data Flow

### Query path

```
Recruiter POST /api/chat → ratelimit → spendcap → rewrite (Haiku) →
embed (Voyage voyage-3) → pgvector top 20 → rerank (Voyage rerank-2) top 5 →
build prompt (system + cached chunks + conversation) → stream Sonnet 4.6 →
parse [n] citation tags → emit SSE token + citation events →
persist message + cost → emit done
```

**Wall-clock targets:**
- First token (cold): ≤ 4s
- Full answer (~400 tokens): 6–10s
- Follow-up question, same session, cache warm: first token ≤ 1.5s

**Cost per query (rough):**
- First question: ~₹2.5 (Sonnet cold + Voyage + Haiku)
- Follow-up with cache hit: ~₹0.4
- Daily cap of ₹200 = ~80 cold + 400 warm — comfortably more than any real recruiter session.

### Ingest path

Three sources, all upserted into the same `documents` table:

- **Source A — GitHub** (`HArshit123455/job-mcp` and any other public repos): clone or REST → tree-sitter symbol chunks (fallback: 80-line sliding window) → Haiku one-line summary → Voyage `voyage-code` embed → upsert with `content_hash` PK (idempotent).
- **Source B — Experience MDX** (`/content/experience/*.mdx`): parse front-matter, chunk at h2 headings, embed with `voyage-3`, upsert.
- **Source C — Snippet MDX** (`/content/snippets/*.mdx`): same as B; front-matter requires `source_project` to render the "Code excerpt (sanitized)" badge. **No GitHub link** because source is private.

**Idempotency:** content_hash unique key. Re-ingesting an unchanged repo is ~zero cost. Typical re-ingest after a PR: ~5 chunks change, ~1s total, ~₹0.1 spend.

**Triggers:**
- GitHub Action on push to public repos → POST `/api/admin/ingest` with `source: "github"`.
- GitHub Action on push to `/content/**.mdx` → POST `/api/admin/ingest` with `source: "experience"|"snippets"`.
- Manual: `curl -H "Authorization: Bearer $INGEST_TOKEN" ...` for ad-hoc refreshes.

---

## 6. Error Handling, Rate-Limit & Spend-Cap

### Token-bucket rate limit (Postgres-only, atomic)

Schema:
```sql
CREATE TABLE rate_limits (
  ip_hash       text PRIMARY KEY,
  bucket_tokens double precision NOT NULL,
  last_refill   timestamptz NOT NULL DEFAULT now()
);
```

Atomic consume (allowed to go negative for accurate Retry-After):
```sql
WITH cap AS (
  SELECT 10::double precision AS max_tokens,
         (10.0 / 3600.0)::double precision AS refill_rate
)
INSERT INTO rate_limits (ip_hash, bucket_tokens, last_refill)
VALUES ($1, (SELECT max_tokens FROM cap), now())
ON CONFLICT (ip_hash) DO UPDATE
SET
  bucket_tokens = LEAST(
    (SELECT max_tokens FROM cap),
    rate_limits.bucket_tokens
      + EXTRACT(EPOCH FROM (now() - rate_limits.last_refill))
        * (SELECT refill_rate FROM cap)
  ) - $2,
  last_refill = now()
RETURNING bucket_tokens;
```

Returned tokens ≥ 0 → allowed. Negative → reject with `retryAfter = ceil(-tokens / refill_rate)`.

**Defaults:** 10 questions per rolling hour per IP. Tunable via env.

**IP hashing:** `sha256(req.ip + DAILY_SALT)` where `DAILY_SALT` rotates at IST midnight. No IPs stored in plaintext; yesterday's hashes are useless tomorrow.

### Daily spend cap

```sql
CREATE TABLE spend_tracking (
  date_ist     date PRIMARY KEY,
  cents_spent  bigint NOT NULL DEFAULT 0
);
```

`recordSpend(cents)` fires after every paid call. `checkCap()` runs **before each paid stage** (rewrite, embed, rerank, generate) so a partial response never crosses the cap by accident. Cap defaults to ₹200/day, env-tunable.

### Failure modes

| Failure | User experience | Internal action |
|---|---|---|
| Anthropic 5xx / timeout | SSE error event with friendly message; retrieved chunks still render | Retry once with 500ms jitter, then surface |
| Voyage embed 5xx | Friendly error or fallback | Retry once, then fall back to Postgres BM25 (`to_tsvector`) so retrieval still works degraded |
| Voyage rerank fails | Silent (top-5 from initial cosine used) | Skip rerank stage |
| Postgres unavailable | 503 + brief-unavailable message | None — Neon usually recovers in <30s |
| Rate limit hit | SSE `rate_limited` event with countdown | None — by design |
| Spend cap hit | SSE `spend_capped` event with email + "back at midnight IST" | Logged for stats |
| Hallucinated `[n]` citation | Silently dropped from UI | Logged as `metric: citation_hallucination` |
| Client aborts stream | (silent) | `abortSignal` cancels Anthropic upstream so we stop being charged |

### Logging

Single structured `request_completed` log per chat request via pino: `request_id, ip_hash, chunks_retrieved[], chunks_cited[], tokens_in, tokens_out, cost_cents, ms_total, ms_per_stage, error?`. Powers the `/api/admin/stats` dashboard.

### Secrets

All in Vercel env, never client-readable: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`, `INGEST_TOKEN`, `DAILY_SALT`, `DAILY_CAP_CENTS`.

---

## 7. Content Authoring Scope

### What I (Claude) author

| Asset | Source | Approval |
|---|---|---|
| `/content/seed-questions.json` (25 recruiter questions, grouped by intent) | Inferred from job market + your experience | You review, can swap any |
| `/content/landing.mdx` (hero + demo prompts) | Two stylistic variants | You pick one |
| `/content/snippets/*.mdx` from `job-mcp` (~10 cards) | Direct read of public source | You review, mark any to redact |
| `/content/snippets/*.mdx` from `auth` (~5–8 cards) | Direct read of Zykrr code, sanitized: strip table/column names, business logic, client identifiers, internal endpoints | You review every snippet line-by-line before publish |
| `/content/snippets/*.mdx` from `insights` (~3–5 cards) | Direct read of source, sanitized | You review |
| `/content/experience/*.mdx` skeletons + body (Zykrr, EIL trainee, DTU education, Pro-Shop, Spam Classifier) | Resume + memory + your code | You review, edit phrasing |

### What you supply

Already supplied (resume + this conversation):
- Name, contact, employer history, education, dates, stack, achievements.
- GitHub: `HArshit123455`, LinkedIn: `harshit-sindhu`, LeetCode: `Harry_S`.
- Permission to read `auth` and `insights` source for snippet mining.

Still needed at Pass 1 review time:
- Approval/redaction notes per `auth` snippet card before publish.
- Confirm public profile picture (or skip — clean text-only landing also fine).

### Authoring workflow

1. **Pass 1** (after spec → plan → bootstrap): I draft seed questions + landing (2 variants) + all `job-mcp` snippets + experience skeletons with your facts.
2. **You review Pass 1**, pick landing variant, mark any redactions.
3. **Pass 2**: I draft `auth` + `insights` snippets and complete experience bodies.
4. **You approve final content**, ingest fires, site goes live.

---

## 8. Testing Strategy

Five layers, each with a clear ownership boundary:

| Layer | File | Tool | Pass criteria |
|---|---|---|---|
| Unit — rate limit | `lib/rate-limit/*.test.ts` | Vitest + ephemeral pg | 100 concurrent consumes never exceed bucket; refill math correct; negative bucket → correct retryAfter |
| Unit — spend cap | `lib/spend-cap/*.test.ts` | Vitest + fake clock | IST midnight rollover correct; integer math no drift after 10k ops |
| Eval — retrieval | `evals/retrieval.eval.ts` | Custom harness vs `/content/seed-questions.json` | recall@5 ≥ 0.9 |
| Integration — chat route | `app/api/chat/route.test.ts` | Vitest + mocked SDKs | SSE event order correct; hallucinated `[n]` dropped; client abort cancels upstream |
| E2E smoke | `e2e/recruiter-flow.spec.ts` | Playwright (CI only, tiny budget) | Type → token → citation card → click → expand, no console errors |

**Explicitly not tested:** LLM output text (eval covers retrieval, the upstream lever); visual regression; load testing; auth flows.

**CI gate (all PRs):** vitest pass + playwright pass + retrieval eval recall@5 ≥ 0.9.

---

## 9. Open Risks & Decisions Deferred

| Risk | Mitigation |
|---|---|
| GitHub username `HArshit123455` may be wrong-cased or the repo may not be public yet | Verify via `https://api.github.com/users/HArshit123455` during plan phase; if 404 or repo private, pause and ask Harshit before building Source A |
| `auth` snippet sanitization is judgment-heavy | Two-person review: I draft, Harshit approves each line before publish. Default to over-redaction |
| Voyage AI free tier may not exist by ship date | Fallback: OpenAI `text-embedding-3-small` (also 1024d-compatible with adjustment). Decision deferred until plan phase |
| Vercel function timeout (60s on free tier, 300s on Pro) | Streaming makes this irrelevant for chat; ingest of large repos may need chunking by file batches |
| Cold-start latency on free Neon | Acceptable for v1; upgrade to paid Neon if cold-starts > 1s become common |

---

## 10. Appendix

### Environment variables

```
DATABASE_URL=                       # Neon Postgres connection string
ANTHROPIC_API_KEY=                  # Claude (Sonnet 4.6 + Haiku 4.5)
VOYAGE_API_KEY=                     # Voyage AI (voyage-3, voyage-code, rerank-2)
INGEST_TOKEN=                       # bearer token for /api/admin/* routes
DAILY_SALT=                         # rotated at IST midnight, used in IP hash
DAILY_CAP_CENTS=20000               # ₹200/day default
RATE_LIMIT_MAX=10                   # questions per rolling hour per IP
RATE_LIMIT_WINDOW_SECONDS=3600
GITHUB_USERNAME=HArshit123455       # Source A indexing target
GITHUB_TOKEN=                       # optional, raises rate limit for ingest
```

### Identity strings (for landing footer)

- Name: Harshit Sindhu
- Email: harshitsindhu10@gmail.com
- LinkedIn: https://www.linkedin.com/in/harshit-sindhu/
- LeetCode: https://leetcode.com/u/Harry_S/
- GitHub: https://github.com/HArshit123455

### File-tree snapshot (target after Phase 1)

```
D:\reverse-resume\
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   └── admin/
│   │       ├── ingest/route.ts
│   │       └── stats/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat-shell.tsx
│   └── citations-panel.tsx
├── lib/
│   ├── rag/{retrieve,generate,rewrite}.ts
│   ├── rate-limit/postgres-token-bucket.ts
│   ├── spend-cap/daily-cap.ts
│   ├── ingest/{github,mdx}.ts
│   └── db/{schema,client}.ts
├── content/
│   ├── landing.mdx
│   ├── seed-questions.json
│   ├── experience/*.mdx
│   └── snippets/*.mdx
├── evals/
│   └── retrieval.eval.ts
├── e2e/
│   └── recruiter-flow.spec.ts
├── drizzle/
│   └── migrations/
├── docs/superpowers/specs/
│   └── 2026-05-10-reverse-resume-design.md   ← this file
├── package.json
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
└── README.md
```
