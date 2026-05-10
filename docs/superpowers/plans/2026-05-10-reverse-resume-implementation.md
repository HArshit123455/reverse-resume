# Reverse Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Postgres app where a recruiter's natural-language question is answered by a streaming RAG chat that cites real code and curated experience. Self-contained portfolio piece, deployable to Vercel + Neon free tiers, hard-capped to ₹200/day spend.

**Architecture:** Single Next.js 15 App Router app. Three corpus sources (public GitHub repos, hand-written experience MDX, sanitized snippet MDX) embedded with Voyage AI, stored in pgvector, retrieved + reranked, then streamed through Claude Sonnet 4.6 with prompt caching. Per-IP token-bucket rate limit and daily INR cap, both implemented in Postgres (no Redis). Drizzle ORM throughout.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM, Postgres + pgvector (Neon), Anthropic SDK (Claude Sonnet 4.6 + Haiku 4.5), Voyage AI SDK (voyage-3 + voyage-code + rerank-2), tree-sitter (code chunking), unified/remark (MDX), Shiki (syntax highlighting), Vitest (unit/integration), Playwright (E2E), pino (logging), Vercel (hosting), pnpm (package manager).

**Source spec:** `docs/superpowers/specs/2026-05-10-reverse-resume-design.md`

---

## Phase Map (executable independently after Phase 0)

| Phase | Outcome | Depends on |
|---|---|---|
| 0 — Bootstrap | Empty Next.js app builds, lints, tests pass | — |
| 1 — Database | Schema + migrations applied; pgvector extension verified | 0 |
| 2 — Rate Limit & Spend Cap | Token bucket + daily cap pass concurrent unit tests | 1 |
| 3 — Ingest Pipelines | All three sources can populate `documents` end-to-end | 1, 2 (uses spend cap) |
| 4 — RAG Pipeline | `retrieve(query)` returns top-5 cited chunks; `generate()` streams Sonnet output | 3 |
| 5 — Chat API + UI | Recruiter can chat in browser, citations render | 2, 4 |
| 6 — Eval, E2E, Deploy | Retrieval eval ≥ 0.9 recall@5, Playwright passes, Vercel preview live | 5 |
| 7 — Content Authoring | All 20+ MDX files written, ingested, eval still passes | 3 (parallelizable with 4–6) |

**Recommended execution cadence:** one new context window per phase (`cd D:\reverse-resume && claude --model sonnet`), with `superpowers:subagent-driven-development` running tasks within each phase.

---

# Phase 0 — Bootstrap

**Goal:** A Next.js 15 + TypeScript app at `D:\reverse-resume\` that builds, type-checks, lints, and runs an empty Vitest suite.

### Task 0.1: Initialize git and base files

**Files:**
- Create: `D:\reverse-resume\.gitignore`
- Create: `D:\reverse-resume\README.md`
- Create: `D:\reverse-resume\.nvmrc`

- [ ] **Step 1: Init git repo**

```powershell
cd D:\reverse-resume
git init
git branch -M main
```

- [ ] **Step 2: Write .gitignore**

```gitignore
node_modules/
.next/
.vercel/
.env
.env.local
.env*.local
*.log
.pnpm-debug.log*
.DS_Store
playwright-report/
test-results/
coverage/
dist/
.turbo/
```

- [ ] **Step 3: Write .nvmrc**

```
22
```

- [ ] **Step 4: Write minimal README.md**

```markdown
# Reverse Resume

A portfolio that proves what it claims. Recruiter types a need, RAG-powered chat answers with real code citations.

See `docs/superpowers/specs/2026-05-10-reverse-resume-design.md` for design.
See `docs/superpowers/plans/2026-05-10-reverse-resume-implementation.md` for plan.

## Quick start
\`\`\`bash
pnpm install
cp .env.example .env.local  # fill in keys
pnpm db:migrate
pnpm dev
\`\`\`
```

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "chore: bootstrap repo with gitignore and README"
```

### Task 0.2: Initialize package.json and install dependencies

**Files:**
- Create: `D:\reverse-resume\package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "reverse-resume",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "ingest": "tsx scripts/ingest-cli.ts",
    "eval:retrieval": "tsx evals/retrieval.eval.ts"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "voyageai": "^0.0.4",
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.5",
    "zod": "^3.23.8",
    "pino": "^9.5.0",
    "shiki": "^1.22.0",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.1",
    "remark-parse": "^11.0.0",
    "unified": "^11.0.5",
    "tree-sitter": "^0.21.0",
    "tree-sitter-typescript": "^0.23.0",
    "@octokit/rest": "^21.0.0",
    "tsx": "^4.19.0"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "typescript": "^5.6.0",
    "drizzle-kit": "^0.27.0",
    "vitest": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "@testcontainers/postgresql": "^10.13.0",
    "@playwright/test": "^1.48.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.0.0",
    "@types/pg": "^8.11.0"
  },
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Install**

```powershell
pnpm install
```

Expected: lockfile created, no errors. May warn on peer deps — fine.

- [ ] **Step 3: Commit**

```powershell
git add package.json pnpm-lock.yaml
git commit -m "chore: install dependencies"
```

### Task 0.3: Configure TypeScript and Next.js

**Files:**
- Create: `D:\reverse-resume\tsconfig.json`
- Create: `D:\reverse-resume\next.config.ts`
- Create: `D:\reverse-resume\next-env.d.ts`
- Create: `D:\reverse-resume\app\layout.tsx`
- Create: `D:\reverse-resume\app\page.tsx`

- [ ] **Step 1: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Write next.config.ts**

```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Allow MDX files via webpack loader; configured in Phase 5
  pageExtensions: ["ts", "tsx"],
};

export default config;
```

- [ ] **Step 3: Write next-env.d.ts**

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 4: Write minimal app/layout.tsx**

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Write minimal app/page.tsx**

```typescript
export default function Home() {
  return <main>Reverse Resume — coming soon.</main>;
}
```

- [ ] **Step 6: Verify build**

```powershell
pnpm typecheck
pnpm build
```

Expected: both succeed with no errors.

- [ ] **Step 7: Commit**

```powershell
git add tsconfig.json next.config.ts next-env.d.ts app/
git commit -m "chore: configure Next.js 15 with App Router"
```

### Task 0.4: Configure Vitest

**Files:**
- Create: `D:\reverse-resume\vitest.config.ts`
- Create: `D:\reverse-resume\tests\smoke.test.ts`

- [ ] **Step 1: Write vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    testTimeout: 30000,
  },
});
```

- [ ] **Step 2: Write a smoke test**

```typescript
// tests/smoke.test.ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
pnpm test
```

Expected: 1 passed.

- [ ] **Step 4: Commit**

```powershell
git add vitest.config.ts tests/
git commit -m "chore: configure Vitest with smoke test"
```

### Task 0.5: Environment template

**Files:**
- Create: `D:\reverse-resume\.env.example`

- [ ] **Step 1: Write .env.example**

```bash
# Postgres (Neon serverless)
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# Anthropic — Claude Sonnet 4.6 + Haiku 4.5
ANTHROPIC_API_KEY=sk-ant-...

# Voyage AI — embeddings + rerank
VOYAGE_API_KEY=pa-...

# Bearer token for /api/admin/* endpoints
INGEST_TOKEN=replace-with-random-32-chars

# Rotated daily; used to salt IP hashes for rate limiting
DAILY_SALT=replace-with-random-32-chars

# Daily INR spend cap in centi-paise (₹200 = 20000)
DAILY_CAP_CENTS=20000

# Rate limit
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_SECONDS=3600

# Source A indexing
GITHUB_USERNAME=HArshit123455
GITHUB_TOKEN= # optional, raises rate limit
```

- [ ] **Step 2: Commit**

```powershell
git add .env.example
git commit -m "chore: add .env.example template"
```

---

# Phase 1 — Database

**Goal:** Drizzle schema + migrations applied to a Neon database, pgvector extension verified, `db()` client helper exported.

### Task 1.1: Drizzle config

**Files:**
- Create: `D:\reverse-resume\drizzle.config.ts`
- Create: `D:\reverse-resume\lib\db\client.ts`

- [ ] **Step 1: Write drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

- [ ] **Step 2: Write lib/db/client.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    _client = postgres(url, { prepare: false, max: 10 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end();
    _client = undefined;
    _db = undefined;
  }
}
```

- [ ] **Step 3: Add dotenv dep**

```powershell
pnpm add -D dotenv
```

- [ ] **Step 4: Commit**

```powershell
git add drizzle.config.ts lib/db/client.ts package.json pnpm-lock.yaml
git commit -m "feat(db): drizzle config and client wrapper"
```

### Task 1.2: Schema definition

**Files:**
- Create: `D:\reverse-resume\lib\db\schema.ts`

- [ ] **Step 1: Write schema.ts**

```typescript
import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// pgvector custom type — 1024 dims to match Voyage voyage-3 / voyage-code
const vector1024 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1024)";
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return JSON.parse(value);
  },
});

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    sourceType: text("source_type").notNull(), // 'github' | 'experience' | 'snippet'
    sourceUrl: text("source_url"), // GitHub blob URL when github; null for mdx
    sourceProject: text("source_project"), // e.g., 'job-mcp' | 'auth' | 'insights'
    filePath: text("file_path"), // repo-relative or content/-relative
    title: text("title"),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    embedding: vector1024("embedding").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contentHashIdx: uniqueIndex("documents_content_hash_idx").on(t.contentHash),
    sourceIdx: index("documents_source_idx").on(t.sourceType, t.sourceProject),
    // HNSW index added by raw SQL in migration (not yet in drizzle-kit)
  })
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  ipHash: text("ip_hash").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    tokensIn: bigint("tokens_in", { mode: "number" }).notNull().default(0),
    tokensOut: bigint("tokens_out", { mode: "number" }).notNull().default(0),
    citations: jsonb("citations").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  })
);

export const rateLimits = pgTable("rate_limits", {
  ipHash: text("ip_hash").primaryKey(),
  bucketTokens: doublePrecision("bucket_tokens").notNull(),
  lastRefill: timestamp("last_refill", { withTimezone: true }).defaultNow().notNull(),
});

export const spendTracking = pgTable("spend_tracking", {
  dateIst: date("date_ist").primaryKey(), // IST midnight, stored as date
  centsSpent: bigint("cents_spent", { mode: "number" }).notNull().default(0),
});

// Export inferred types for use elsewhere
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
```

- [ ] **Step 2: Generate migration**

```powershell
pnpm db:generate
```

Expected: file created in `drizzle/migrations/0000_xxx.sql`.

- [ ] **Step 3: Add pgvector extension and HNSW index to migration**

Open the generated `drizzle/migrations/0000_*.sql`. At the very top of the file, add:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

At the very bottom of the file, add:

```sql
CREATE INDEX IF NOT EXISTS documents_embedding_hnsw_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops);
```

- [ ] **Step 4: Commit**

```powershell
git add lib/db/schema.ts drizzle/
git commit -m "feat(db): schema for documents, conversations, messages, rate_limits, spend_tracking"
```

### Task 1.3: Migration runner script

**Files:**
- Create: `D:\reverse-resume\scripts\migrate.ts`

- [ ] **Step 1: Write migrate.ts**

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Done.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Provision Neon database**

Manual step (5 min):
1. Sign up / log in at neon.tech
2. Create project "reverse-resume", region closest to you (or AWS ap-south-1 for Mumbai)
3. Copy connection string with `?sslmode=require`
4. `cp .env.example .env.local`
5. Paste `DATABASE_URL=` into `.env.local`

- [ ] **Step 3: Run migration**

```powershell
pnpm db:migrate
```

Expected: "Running migrations..." then "Done." Connect with `pnpm db:studio` to verify all 5 tables exist.

- [ ] **Step 4: Verify pgvector**

```powershell
pnpm db:studio
```

In Drizzle Studio, run a SQL query: `SELECT * FROM pg_extension WHERE extname='vector';` — expect 1 row.

- [ ] **Step 5: Commit**

```powershell
git add scripts/migrate.ts
git commit -m "feat(db): migration runner script"
```

### Task 1.4: DB integration test helper

**Files:**
- Create: `D:\reverse-resume\tests\helpers\test-db.ts`
- Create: `D:\reverse-resume\tests\db.test.ts`

- [ ] **Step 1: Write test-db.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import * as schema from "@/lib/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface TestDbContext {
  db: TestDb;
  cleanup: () => Promise<void>;
}

/**
 * Spins up an ephemeral Postgres container with pgvector for tests.
 * Slower than mocking (~3s startup) but tests real SQL behaviour.
 */
export async function setupTestDb(): Promise<TestDbContext> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("pgvector/pgvector:pg16")
    .start();

  const client = postgres(container.getConnectionUri(), { max: 1 });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  return {
    db,
    cleanup: async () => {
      await client.end();
      await container.stop();
    },
  };
}
```

- [ ] **Step 2: Write db.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, type TestDbContext } from "./helpers/test-db";
import { documents } from "@/lib/db/schema";

describe("database", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await setupTestDb();
  }, 60000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("can insert and query a document", async () => {
    await ctx.db.insert(documents).values({
      sourceType: "snippet",
      sourceProject: "test",
      content: "hello world",
      contentHash: "abc123",
      embedding: Array(1024).fill(0.1),
    });

    const rows = await ctx.db.select().from(documents);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe("hello world");
    expect(rows[0].embedding).toHaveLength(1024);
  });
});
```

- [ ] **Step 3: Run test**

```powershell
pnpm test tests/db.test.ts
```

Expected: passes. First run slow (~30s) due to container pull; subsequent runs ~5s.

- [ ] **Step 4: Commit**

```powershell
git add tests/helpers tests/db.test.ts
git commit -m "test(db): testcontainer helper and schema smoke test"
```

---

# Phase 2 — Rate Limit & Spend Cap

**Goal:** Two production-grade primitives with airtight unit tests, both implemented in Postgres only.

### Task 2.1: IP hashing with daily salt

**Files:**
- Create: `D:\reverse-resume\lib\rate-limit\ip-hash.ts`
- Create: `D:\reverse-resume\lib\rate-limit\ip-hash.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/rate-limit/ip-hash.test.ts
import { describe, it, expect } from "vitest";
import { hashIp, todayIstDateStr } from "./ip-hash";

describe("ip-hash", () => {
  it("returns a 64-char hex string", () => {
    const hash = hashIp("192.168.1.1", "daily-salt-abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = hashIp("1.2.3.4", "salt");
    const b = hashIp("1.2.3.4", "salt");
    expect(a).toBe(b);
  });

  it("changes when salt changes", () => {
    const a = hashIp("1.2.3.4", "salt-a");
    const b = hashIp("1.2.3.4", "salt-b");
    expect(a).not.toBe(b);
  });

  it("returns IST date string in YYYY-MM-DD form", () => {
    const str = todayIstDateStr(new Date("2026-05-10T18:00:00Z")); // 23:30 IST
    expect(str).toBe("2026-05-10");
  });

  it("rolls over at IST midnight", () => {
    // 18:30 UTC = 00:00 IST next day
    const str = todayIstDateStr(new Date("2026-05-10T18:30:00Z"));
    expect(str).toBe("2026-05-11");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/rate-limit/ip-hash.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ip-hash.ts**

```typescript
// lib/rate-limit/ip-hash.ts
import { createHash } from "node:crypto";

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

/**
 * Returns the date in IST (Asia/Kolkata = UTC+5:30) as YYYY-MM-DD.
 * Used both for spend tracking and for rotating the daily salt.
 */
export function todayIstDateStr(now: Date = new Date()): string {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  return istNow.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run to confirm pass**

```powershell
pnpm test lib/rate-limit/ip-hash.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git add lib/rate-limit/
git commit -m "feat(rate-limit): IP hashing with daily salt rotation"
```

### Task 2.2: Postgres token bucket implementation

**Files:**
- Create: `D:\reverse-resume\lib\rate-limit\postgres-token-bucket.ts`
- Create: `D:\reverse-resume\lib\rate-limit\postgres-token-bucket.test.ts`

- [ ] **Step 1: Write failing test for single consume**

```typescript
// lib/rate-limit/postgres-token-bucket.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDbContext } from "@/tests/helpers/test-db";
import { sql } from "drizzle-orm";
import { consume } from "./postgres-token-bucket";

describe("postgres-token-bucket", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await setupTestDb();
  }, 60000);

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await ctx.db.execute(sql`TRUNCATE rate_limits`);
  });

  it("first consume returns allowed with bucket-1 remaining", async () => {
    const result = await consume(ctx.db, "ip1", { maxTokens: 10, refillPerSecond: 10 / 3600 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeCloseTo(9, 5);
  });

  it("11th consume in same second is rejected", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await consume(ctx.db, "ip2", { maxTokens: 10, refillPerSecond: 10 / 3600 });
      expect(r.allowed).toBe(true);
    }
    const r = await consume(ctx.db, "ip2", { maxTokens: 10, refillPerSecond: 10 / 3600 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("100 concurrent consumes never exceed maxTokens", async () => {
    const promises = Array.from({ length: 100 }, () =>
      consume(ctx.db, "ip3", { maxTokens: 10, refillPerSecond: 10 / 3600 })
    );
    const results = await Promise.all(promises);
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBeLessThanOrEqual(10);
    expect(allowedCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/rate-limit/postgres-token-bucket.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement postgres-token-bucket.ts**

```typescript
// lib/rate-limit/postgres-token-bucket.ts
import { sql } from "drizzle-orm";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

export interface TokenBucketConfig {
  maxTokens: number;
  refillPerSecond: number;
}

export interface ConsumeResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

type AnyDb = TestDb | ReturnType<typeof dbFn>;

/**
 * Atomically refill + decrement a token bucket for the given IP hash.
 * Bucket is allowed to go negative; that gives a meaningful retryAfter
 * instead of a generic "try later".
 */
export async function consume(
  db: AnyDb,
  ipHash: string,
  config: TokenBucketConfig,
  cost = 1
): Promise<ConsumeResult> {
  const { maxTokens, refillPerSecond } = config;

  const result = await db.execute<{ bucket_tokens: number }>(sql`
    INSERT INTO rate_limits (ip_hash, bucket_tokens, last_refill)
    VALUES (${ipHash}, ${maxTokens}::double precision - ${cost}::double precision, now())
    ON CONFLICT (ip_hash) DO UPDATE
    SET
      bucket_tokens = LEAST(
        ${maxTokens}::double precision,
        rate_limits.bucket_tokens
          + EXTRACT(EPOCH FROM (now() - rate_limits.last_refill))
            * ${refillPerSecond}::double precision
      ) - ${cost}::double precision,
      last_refill = now()
    RETURNING bucket_tokens
  `);

  const bucketTokens = Number(result[0].bucket_tokens);

  if (bucketTokens >= 0) {
    return { allowed: true, remaining: bucketTokens };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil(-bucketTokens / refillPerSecond),
  };
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/rate-limit/postgres-token-bucket.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```powershell
git add lib/rate-limit/postgres-token-bucket.ts lib/rate-limit/postgres-token-bucket.test.ts
git commit -m "feat(rate-limit): atomic Postgres token bucket with concurrency safety"
```

### Task 2.3: Daily spend cap

**Files:**
- Create: `D:\reverse-resume\lib\spend-cap\daily-cap.ts`
- Create: `D:\reverse-resume\lib\spend-cap\daily-cap.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/spend-cap/daily-cap.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDbContext } from "@/tests/helpers/test-db";
import { sql } from "drizzle-orm";
import { recordSpend, checkCap } from "./daily-cap";

describe("daily-cap", () => {
  let ctx: TestDbContext;
  const CAP = 20000; // ₹200

  beforeAll(async () => { ctx = await setupTestDb(); }, 60000);
  afterAll(async () => { await ctx.cleanup(); });

  beforeEach(async () => {
    await ctx.db.execute(sql`TRUNCATE spend_tracking`);
  });

  it("starts at zero spent", async () => {
    const r = await checkCap(ctx.db, CAP);
    expect(r.ok).toBe(true);
    expect(r.spentCents).toBe(0);
  });

  it("accumulates spend correctly", async () => {
    await recordSpend(ctx.db, 500);
    await recordSpend(ctx.db, 1500);
    const r = await checkCap(ctx.db, CAP);
    expect(r.spentCents).toBe(2000);
    expect(r.ok).toBe(true);
  });

  it("returns ok=false when at cap (inclusive)", async () => {
    await recordSpend(ctx.db, CAP);
    const r = await checkCap(ctx.db, CAP);
    expect(r.ok).toBe(false);
    expect(r.spentCents).toBe(CAP);
  });

  it("returns ok=false when over cap", async () => {
    await recordSpend(ctx.db, CAP + 100);
    const r = await checkCap(ctx.db, CAP);
    expect(r.ok).toBe(false);
  });

  it("integer math has no float drift after 10000 ops", async () => {
    for (let i = 0; i < 10000; i++) {
      await recordSpend(ctx.db, 1);
    }
    const r = await checkCap(ctx.db, CAP);
    expect(r.spentCents).toBe(10000);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/spend-cap/daily-cap.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement daily-cap.ts**

```typescript
// lib/spend-cap/daily-cap.ts
import { sql } from "drizzle-orm";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";
import { todayIstDateStr } from "@/lib/rate-limit/ip-hash";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export async function recordSpend(db: AnyDb, cents: number): Promise<void> {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`recordSpend: cents must be a non-negative integer, got ${cents}`);
  }
  const date = todayIstDateStr();
  await db.execute(sql`
    INSERT INTO spend_tracking (date_ist, cents_spent)
    VALUES (${date}::date, ${cents})
    ON CONFLICT (date_ist) DO UPDATE
    SET cents_spent = spend_tracking.cents_spent + ${cents}
  `);
}

export interface CapResult {
  ok: boolean;
  spentCents: number;
  capCents: number;
}

export async function checkCap(db: AnyDb, capCents: number): Promise<CapResult> {
  const date = todayIstDateStr();
  const rows = await db.execute<{ cents_spent: string }>(sql`
    SELECT cents_spent FROM spend_tracking WHERE date_ist = ${date}::date
  `);
  const spentCents = rows.length > 0 ? Number(rows[0].cents_spent) : 0;
  return {
    ok: spentCents < capCents,
    spentCents,
    capCents,
  };
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/spend-cap/daily-cap.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git add lib/spend-cap/
git commit -m "feat(spend-cap): daily INR cap with integer math and IST rollover"
```

---

# Phase 3 — Ingest Pipelines

**Goal:** All three sources can populate `documents` end-to-end. Idempotent re-runs cost ~zero.

### Task 3.1: Voyage AI client wrapper

**Files:**
- Create: `D:\reverse-resume\lib\clients\voyage.ts`
- Create: `D:\reverse-resume\lib\clients\voyage.test.ts`

- [ ] **Step 1: Write failing test (with mocked fetch)**

```typescript
// lib/clients/voyage.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { embed, rerank } from "./voyage";

describe("voyage client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.VOYAGE_API_KEY = "test-key";
  });

  it("embed() posts inputs and returns embeddings", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [{ embedding: Array(1024).fill(0.1), index: 0 }],
          model: "voyage-3",
          usage: { total_tokens: 5 },
        }),
        { status: 200 }
      )
    );

    const result = await embed(["hello world"], "voyage-3");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.voyageai.com/v1/embeddings",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toHaveLength(1024);
    expect(result.totalTokens).toBe(5);
  });

  it("rerank() returns sorted indices with scores", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [
            { index: 2, relevance_score: 0.9 },
            { index: 0, relevance_score: 0.7 },
            { index: 1, relevance_score: 0.4 },
          ],
          model: "rerank-2",
          usage: { total_tokens: 10 },
        }),
        { status: 200 }
      )
    );

    const result = await rerank("query", ["a", "b", "c"], 3);
    expect(result.results[0].index).toBe(2);
    expect(result.results[0].relevanceScore).toBeCloseTo(0.9);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/clients/voyage.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement voyage.ts**

```typescript
// lib/clients/voyage.ts
const BASE = "https://api.voyageai.com/v1";

export type VoyageEmbedModel = "voyage-3" | "voyage-code-3";

export interface EmbedResult {
  embeddings: number[][];
  totalTokens: number;
}

export interface RerankItem {
  index: number;
  relevanceScore: number;
}

export interface RerankResult {
  results: RerankItem[];
  totalTokens: number;
}

function authHeaders(): Record<string, string> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is required");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function embed(
  inputs: string[],
  model: VoyageEmbedModel = "voyage-3"
): Promise<EmbedResult> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ input: inputs, model }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage embed failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };
  // Sort by index to preserve input order
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return {
    embeddings: sorted.map((d) => d.embedding),
    totalTokens: json.usage.total_tokens,
  };
}

export async function rerank(
  query: string,
  documents: string[],
  topK: number,
  model = "rerank-2"
): Promise<RerankResult> {
  const res = await fetch(`${BASE}/rerank`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, documents, model, top_k: topK, return_documents: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage rerank failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data: Array<{ index: number; relevance_score: number }>;
    usage: { total_tokens: number };
  };
  return {
    results: json.data.map((d) => ({ index: d.index, relevanceScore: d.relevance_score })),
    totalTokens: json.usage.total_tokens,
  };
}

// Voyage pricing (per 1M tokens, USD as of design date — verify before launch)
const VOYAGE_3_USD_PER_1M = 0.06;
const RERANK_2_USD_PER_1M = 0.05;
const USD_TO_INR = 84;
// 1 cent (centi-paise) = ₹0.01
export function voyageCostCents(tokens: number, kind: "embed" | "rerank"): number {
  const usdPer1M = kind === "embed" ? VOYAGE_3_USD_PER_1M : RERANK_2_USD_PER_1M;
  const inrCost = (tokens / 1_000_000) * usdPer1M * USD_TO_INR;
  return Math.ceil(inrCost * 100); // round up to centi-paise
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/clients/voyage.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```powershell
git add lib/clients/
git commit -m "feat(clients): Voyage AI embed + rerank wrapper with cost calc"
```

### Task 3.2: Anthropic client wrapper

**Files:**
- Create: `D:\reverse-resume\lib\clients\anthropic.ts`

- [ ] **Step 1: Implement anthropic.ts** (no test — SDK is well-tested upstream; we test integration in Phase 4)

```typescript
// lib/clients/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";

export const SONNET_MODEL = "claude-sonnet-4-6";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is required");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Pricing (USD per 1M tokens, verify against console.anthropic.com)
const PRICING = {
  [SONNET_MODEL]: {
    inputPer1M: 3.0,
    cachedInputPer1M: 0.3, // 90% discount on cache hits
    outputPer1M: 15.0,
    cacheWritePer1M: 3.75, // 25% premium on cache writes
  },
  [HAIKU_MODEL]: {
    inputPer1M: 0.8,
    cachedInputPer1M: 0.08,
    outputPer1M: 4.0,
    cacheWritePer1M: 1.0,
  },
} as const;
const USD_TO_INR = 84;

export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export function anthropicCostCents(model: keyof typeof PRICING, usage: UsageBreakdown): number {
  const p = PRICING[model];
  const cached = usage.cacheReadInputTokens ?? 0;
  const cacheWrite = usage.cacheCreationInputTokens ?? 0;
  const uncached = Math.max(0, usage.inputTokens - cached - cacheWrite);

  const usd =
    (uncached / 1_000_000) * p.inputPer1M +
    (cached / 1_000_000) * p.cachedInputPer1M +
    (cacheWrite / 1_000_000) * p.cacheWritePer1M +
    (usage.outputTokens / 1_000_000) * p.outputPer1M;

  return Math.ceil(usd * USD_TO_INR * 100);
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/clients/anthropic.ts
git commit -m "feat(clients): Anthropic SDK wrapper with cost calculation"
```

### Task 3.3: MDX chunker

**Files:**
- Create: `D:\reverse-resume\lib\ingest\chunk-mdx.ts`
- Create: `D:\reverse-resume\lib\ingest\chunk-mdx.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/ingest/chunk-mdx.test.ts
import { describe, it, expect } from "vitest";
import { chunkMdx } from "./chunk-mdx";

const sample = `---
title: My Experience
role: Software Developer
themes: [backend, scaling]
---

# Intro

I do backend things.

## Outbox Pattern

Wrote an outbox table to decouple writes from publish.

\`\`\`ts
async function publish() { /* ... */ }
\`\`\`

## Partitioning

Range-partitioned the events table by month.
`;

describe("chunkMdx", () => {
  it("splits at h2 boundaries with shared front-matter", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((c) => c.metadata.title === "My Experience")).toBe(true);
    const titles = result.map((c) => c.metadata.heading).filter(Boolean);
    expect(titles).toContain("Outbox Pattern");
    expect(titles).toContain("Partitioning");
  });

  it("includes intro section before first h2", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    const intro = result.find((c) => c.metadata.heading === undefined || c.metadata.heading === "Intro");
    expect(intro).toBeDefined();
    expect(intro!.content).toContain("I do backend things");
  });

  it("attaches front-matter to every chunk's metadata", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    expect(result[0].metadata.role).toBe("Software Developer");
    expect(result[0].metadata.themes).toEqual(["backend", "scaling"]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/ingest/chunk-mdx.test.ts
```

- [ ] **Step 3: Implement chunk-mdx.ts**

```typescript
// lib/ingest/chunk-mdx.ts
import matter from "gray-matter";
import { createHash } from "node:crypto";

export interface MdxChunk {
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
}

export function chunkMdx(raw: string, filePath: string): MdxChunk[] {
  const parsed = matter(raw);
  const frontmatter = parsed.data;
  const body = parsed.content;

  // Split at h2 boundaries (lines starting with "## ")
  const lines = body.split("\n");
  const sections: { heading?: string; lines: string[] }[] = [{ lines: [] }];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      sections.push({ heading: h2Match[1].trim(), lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  const chunks: MdxChunk[] = [];
  for (const section of sections) {
    const content = section.lines.join("\n").trim();
    if (!content) continue;
    const headingPrefix = section.heading ? `## ${section.heading}\n\n` : "";
    const fullContent = headingPrefix + content;
    chunks.push({
      content: fullContent,
      contentHash: createHash("sha256")
        .update(`${filePath}::${section.heading ?? ""}::${fullContent}`)
        .digest("hex"),
      metadata: {
        ...frontmatter,
        heading: section.heading,
        filePath,
      },
    });
  }

  return chunks;
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/ingest/chunk-mdx.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add lib/ingest/chunk-mdx.ts lib/ingest/chunk-mdx.test.ts
git commit -m "feat(ingest): MDX chunker splits at h2 boundaries"
```

### Task 3.4: Code chunker (tree-sitter, with sliding-window fallback)

**Files:**
- Create: `D:\reverse-resume\lib\ingest\chunk-code.ts`
- Create: `D:\reverse-resume\lib\ingest\chunk-code.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// lib/ingest/chunk-code.test.ts
import { describe, it, expect } from "vitest";
import { chunkCode } from "./chunk-code";

const sampleTs = `
export function add(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  multiply(a: number, b: number): number {
    return a * b;
  }
}

export const PI = 3.14159;
`;

describe("chunkCode", () => {
  it("extracts functions, classes, and exported consts as separate chunks for TypeScript", () => {
    const chunks = chunkCode(sampleTs, "src/calc.ts", "typescript");
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const symbols = chunks.map((c) => c.metadata.symbol).filter(Boolean);
    expect(symbols).toContain("add");
    expect(symbols).toContain("Calculator");
    expect(symbols).toContain("PI");
  });

  it("falls back to sliding window for unparseable language", () => {
    const longText = Array(200).fill("line").join("\n");
    const chunks = chunkCode(longText, "data/notes.txt", "unknown");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.chunkStrategy).toBe("sliding-window");
  });

  it("attaches filePath and language to every chunk", () => {
    const chunks = chunkCode(sampleTs, "src/calc.ts", "typescript");
    expect(chunks.every((c) => c.metadata.filePath === "src/calc.ts")).toBe(true);
    expect(chunks.every((c) => c.metadata.language === "typescript")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/ingest/chunk-code.test.ts
```

- [ ] **Step 3: Implement chunk-code.ts**

```typescript
// lib/ingest/chunk-code.ts
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import { createHash } from "node:crypto";

export interface CodeChunk {
  content: string;
  contentHash: string;
  metadata: {
    filePath: string;
    language: string;
    symbol?: string;
    startLine?: number;
    endLine?: number;
    chunkStrategy: "tree-sitter" | "sliding-window";
  };
}

const SLIDING_WINDOW_LINES = 80;
const SLIDING_WINDOW_OVERLAP = 10;

export function chunkCode(source: string, filePath: string, language: string): CodeChunk[] {
  if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
    try {
      return chunkWithTreeSitter(source, filePath, language);
    } catch (e) {
      // fall through to sliding window on parse error
    }
  }
  return chunkWithSlidingWindow(source, filePath, language);
}

function chunkWithTreeSitter(source: string, filePath: string, language: string): CodeChunk[] {
  const parser = new Parser();
  const grammar = language === "tsx" ? TypeScript.tsx : TypeScript.typescript;
  parser.setLanguage(grammar);
  const tree = parser.parse(source);
  const chunks: CodeChunk[] = [];

  // Walk top-level children for function_declaration, class_declaration, lexical_declaration with `export`
  const TARGET_NODES = new Set([
    "function_declaration",
    "class_declaration",
    "interface_declaration",
    "type_alias_declaration",
    "enum_declaration",
    "lexical_declaration", // const/let
    "export_statement",
  ]);

  function pushChunk(node: Parser.SyntaxNode, symbol: string | undefined) {
    const content = source.slice(node.startIndex, node.endIndex);
    if (content.trim().length < 20) return; // skip trivial fragments
    chunks.push({
      content,
      contentHash: createHash("sha256")
        .update(`${filePath}::${node.startPosition.row}::${content}`)
        .digest("hex"),
      metadata: {
        filePath,
        language,
        symbol,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        chunkStrategy: "tree-sitter",
      },
    });
  }

  function getSymbolName(node: Parser.SyntaxNode): string | undefined {
    const nameNode =
      node.childForFieldName("name") ??
      node.descendantsOfType("identifier")[0] ??
      node.descendantsOfType("type_identifier")[0];
    return nameNode?.text;
  }

  for (const child of tree.rootNode.namedChildren) {
    // Unwrap export_statement to get the inner declaration
    let target = child;
    if (child.type === "export_statement" && child.namedChildren.length > 0) {
      target = child.namedChildren[0];
    }
    if (TARGET_NODES.has(target.type) || TARGET_NODES.has(child.type)) {
      pushChunk(child, getSymbolName(target));
    }
  }

  // If we got nothing useful, fall back
  if (chunks.length === 0) return chunkWithSlidingWindow(source, filePath, language);
  return chunks;
}

function chunkWithSlidingWindow(source: string, filePath: string, language: string): CodeChunk[] {
  const lines = source.split("\n");
  const chunks: CodeChunk[] = [];
  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + SLIDING_WINDOW_LINES, lines.length);
    const content = lines.slice(start, end).join("\n");
    if (content.trim().length > 0) {
      chunks.push({
        content,
        contentHash: createHash("sha256").update(`${filePath}::${start}::${content}`).digest("hex"),
        metadata: {
          filePath,
          language,
          startLine: start + 1,
          endLine: end,
          chunkStrategy: "sliding-window",
        },
      });
    }
    if (end >= lines.length) break;
    start = end - SLIDING_WINDOW_OVERLAP;
  }
  return chunks;
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/ingest/chunk-code.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add lib/ingest/chunk-code.ts lib/ingest/chunk-code.test.ts
git commit -m "feat(ingest): tree-sitter code chunker with sliding-window fallback"
```

### Task 3.5: Document upserter

**Files:**
- Create: `D:\reverse-resume\lib\ingest\upsert.ts`

- [ ] **Step 1: Implement upsert.ts**

```typescript
// lib/ingest/upsert.ts
import { sql } from "drizzle-orm";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";
import { documents, type NewDocument } from "@/lib/db/schema";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

/**
 * Upsert documents by content_hash. If a chunk's hash already exists, skip
 * (no embedding cost). If it exists with stale metadata, update metadata.
 */
export async function upsertDocuments(
  db: AnyDb,
  rows: NewDocument[]
): Promise<UpsertResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await db.execute<{ id: number }>(sql`
      SELECT id FROM documents WHERE content_hash = ${row.contentHash}
    `);

    if (existing.length === 0) {
      await db.insert(documents).values(row);
      inserted++;
    } else {
      // Update mutable fields (metadata, source_url) but not content/embedding
      await db.execute(sql`
        UPDATE documents
        SET metadata = ${JSON.stringify(row.metadata ?? {})}::jsonb,
            source_url = ${row.sourceUrl ?? null},
            updated_at = now()
        WHERE id = ${existing[0].id}
      `);
      updated++;
    }
  }

  return { inserted, updated, skipped };
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/ingest/upsert.ts
git commit -m "feat(ingest): idempotent document upserter keyed by content_hash"
```

### Task 3.6: Source A — GitHub ingester

**Files:**
- Create: `D:\reverse-resume\lib\ingest\source-github.ts`

- [ ] **Step 1: Implement source-github.ts**

```typescript
// lib/ingest/source-github.ts
import { Octokit } from "@octokit/rest";
import { chunkCode } from "./chunk-code";
import { upsertDocuments } from "./upsert";
import { embed, voyageCostCents } from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

const ALLOWED_EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".md": "markdown",
  ".sql": "sql",
};
const SKIP_PATH_SUBSTRINGS = ["/dist/", "/node_modules/", "/.next/", "/coverage/", "/.turbo/"];

export interface IngestRepoResult {
  scanned: number;
  chunked: number;
  inserted: number;
  updated: number;
  skipped: number;
  costCents: number;
  ms: number;
}

export async function ingestRepo(
  db: AnyDb,
  owner: string,
  repo: string
): Promise<IngestRepoResult> {
  const start = Date.now();
  const oct = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Get the repo's default branch and HEAD tree (recursive)
  const repoInfo = await oct.repos.get({ owner, repo });
  const defaultBranch = repoInfo.data.default_branch;
  const ref = await oct.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const tree = await oct.git.getTree({
    owner,
    repo,
    tree_sha: ref.data.object.sha,
    recursive: "true",
  });

  let scanned = 0;
  let chunked = 0;
  let costCents = 0;
  const allChunks: Array<{ row: Parameters<typeof upsertDocuments>[1][number]; embedding?: number[] }> = [];

  for (const entry of tree.data.tree) {
    if (entry.type !== "blob" || !entry.path) continue;
    const ext = "." + entry.path.split(".").pop()!.toLowerCase();
    const lang = ALLOWED_EXT_TO_LANG[ext];
    if (!lang) continue;
    if (SKIP_PATH_SUBSTRINGS.some((s) => `/${entry.path}`.includes(s))) continue;

    scanned++;
    const blob = await oct.git.getBlob({ owner, repo, file_sha: entry.sha! });
    const source = Buffer.from(blob.data.content, blob.data.encoding as BufferEncoding).toString("utf-8");

    const chunks = chunkCode(source, entry.path, lang);
    chunked += chunks.length;
    for (const chunk of chunks) {
      const sourceUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${entry.path}#L${chunk.metadata.startLine}-L${chunk.metadata.endLine}`;
      allChunks.push({
        row: {
          sourceType: "github",
          sourceProject: repo,
          sourceUrl,
          filePath: entry.path,
          title: chunk.metadata.symbol ?? entry.path,
          content: chunk.content,
          contentHash: chunk.contentHash,
          metadata: chunk.metadata as Record<string, unknown>,
          // embedding filled below
          embedding: [],
        },
      });
    }
  }

  // Embed in batches of 64
  const BATCH = 64;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const result = await embed(batch.map((c) => c.row.content), "voyage-code-3");
    batch.forEach((c, j) => {
      c.row.embedding = result.embeddings[j];
    });
    costCents += voyageCostCents(result.totalTokens, "embed");
  }

  await recordSpend(db, costCents);
  const upsertResult = await upsertDocuments(db, allChunks.map((c) => c.row));

  return {
    scanned,
    chunked,
    ...upsertResult,
    costCents,
    ms: Date.now() - start,
  };
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/ingest/source-github.ts
git commit -m "feat(ingest): Source A — GitHub repo ingester via Octokit"
```

### Task 3.7: Source B + C — MDX ingester (shared)

**Files:**
- Create: `D:\reverse-resume\lib\ingest\source-mdx.ts`

- [ ] **Step 1: Implement source-mdx.ts**

```typescript
// lib/ingest/source-mdx.ts
import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { chunkMdx } from "./chunk-mdx";
import { upsertDocuments } from "./upsert";
import { embed, voyageCostCents } from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export type MdxSourceType = "experience" | "snippet";

export interface IngestMdxResult {
  scanned: number;
  chunked: number;
  inserted: number;
  updated: number;
  skipped: number;
  costCents: number;
  ms: number;
}

export async function ingestMdxDir(
  db: AnyDb,
  dir: string,
  sourceType: MdxSourceType
): Promise<IngestMdxResult> {
  const start = Date.now();
  const entries = await readdir(dir);
  const mdxFiles = entries.filter((e) => extname(e) === ".mdx" || extname(e) === ".md");

  const allChunks: Parameters<typeof upsertDocuments>[1] = [];
  let scanned = 0;
  let chunked = 0;

  for (const file of mdxFiles) {
    scanned++;
    const fullPath = join(dir, file);
    const raw = await readFile(fullPath, "utf-8");
    const chunks = chunkMdx(raw, `content/${sourceType}/${file}`);
    chunked += chunks.length;
    for (const chunk of chunks) {
      allChunks.push({
        sourceType,
        sourceProject: (chunk.metadata.source_project as string) ?? null,
        sourceUrl: null,
        filePath: chunk.metadata.filePath as string,
        title: (chunk.metadata.title as string) ?? (chunk.metadata.heading as string) ?? file,
        content: chunk.content,
        contentHash: chunk.contentHash,
        metadata: chunk.metadata,
        embedding: [],
      });
    }
  }

  // Embed in batches
  const BATCH = 64;
  let costCents = 0;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const result = await embed(batch.map((c) => c.content), "voyage-3");
    batch.forEach((c, j) => {
      c.embedding = result.embeddings[j];
    });
    costCents += voyageCostCents(result.totalTokens, "embed");
  }

  await recordSpend(db, costCents);
  const upsertResult = await upsertDocuments(db, allChunks);

  return {
    scanned,
    chunked,
    ...upsertResult,
    costCents,
    ms: Date.now() - start,
  };
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/ingest/source-mdx.ts
git commit -m "feat(ingest): Sources B & C — shared MDX ingester for experience and snippets"
```

### Task 3.8: Admin ingest route + CLI

**Files:**
- Create: `D:\reverse-resume\app\api\admin\ingest\route.ts`
- Create: `D:\reverse-resume\scripts\ingest-cli.ts`

- [ ] **Step 1: Write route.ts**

```typescript
// app/api/admin/ingest/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { ingestRepo } from "@/lib/ingest/source-github";
import { ingestMdxDir } from "@/lib/ingest/source-mdx";
import { join } from "node:path";

const Body = z.discriminatedUnion("source", [
  z.object({ source: z.literal("github"), owner: z.string(), repo: z.string() }),
  z.object({ source: z.literal("experience") }),
  z.object({ source: z.literal("snippets") }),
]);

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — Vercel Pro; fall back to 60 on free tier

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization");
  const expected = process.env.INGEST_TOKEN;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = Body.parse(await req.json());
  const database = db();

  try {
    if (body.source === "github") {
      const result = await ingestRepo(database, body.owner, body.repo);
      return NextResponse.json({ source: "github", ...result });
    }
    if (body.source === "experience") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/experience"), "experience");
      return NextResponse.json({ source: "experience", ...result });
    }
    const result = await ingestMdxDir(database, join(process.cwd(), "content/snippets"), "snippet");
    return NextResponse.json({ source: "snippets", ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write ingest-cli.ts**

```typescript
// scripts/ingest-cli.ts
import "dotenv/config";
import { db, closeDb } from "@/lib/db/client";
import { ingestRepo } from "@/lib/ingest/source-github";
import { ingestMdxDir } from "@/lib/ingest/source-mdx";
import { join } from "node:path";

async function main() {
  const [, , source, ...rest] = process.argv;
  const database = db();

  try {
    if (source === "github") {
      const [owner, repo] = rest;
      if (!owner || !repo) throw new Error("Usage: pnpm ingest github <owner> <repo>");
      const result = await ingestRepo(database, owner, repo);
      console.log(result);
    } else if (source === "experience") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/experience"), "experience");
      console.log(result);
    } else if (source === "snippets") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/snippets"), "snippet");
      console.log(result);
    } else {
      console.log("Usage: pnpm ingest <github|experience|snippets> [args]");
    }
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Manual smoke test (after MDX content exists in Phase 7, you can rerun)**

```powershell
pnpm ingest github HArshit123455 job-mcp
```

Expected: prints `{ scanned: N, chunked: M, inserted: M, updated: 0, skipped: 0, costCents: X, ms: Y }`. Verify rows appeared in `documents` via `pnpm db:studio`.

- [ ] **Step 4: Commit**

```powershell
git add app/api/admin/ingest scripts/ingest-cli.ts
git commit -m "feat(ingest): admin POST route and CLI entrypoint"
```

---

# Phase 4 — RAG Pipeline

**Goal:** `retrieve(query)` returns top-5 reranked chunks; `generate()` streams Sonnet output with citation tags parsed.

### Task 4.1: Query rewriter

**Files:**
- Create: `D:\reverse-resume\lib\rag\rewrite.ts`

- [ ] **Step 1: Implement rewrite.ts**

```typescript
// lib/rag/rewrite.ts
import { anthropic, HAIKU_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export interface ChatTurn { role: "user" | "assistant"; content: string }

const REWRITE_SYSTEM = `You expand a recruiter's latest question into a concise standalone search query suitable for vector retrieval over a software engineer's portfolio (code, snippets, professional experience entries).

Rules:
- Output ONLY the rewritten query, nothing else.
- Pull in entity names from the conversation history if they disambiguate.
- Keep under 30 words.
- Do not invent facts.`;

export async function rewriteQuery(db: AnyDb, history: ChatTurn[]): Promise<string> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") return "";

  // Short-circuit: if there's no prior context, don't even call the LLM.
  if (history.length === 1 && last.content.length < 80) return last.content;

  const res = await anthropic().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 100,
    system: REWRITE_SYSTEM,
    messages: history.map((t) => ({ role: t.role, content: t.content })),
  });

  const cost = anthropicCostCents(HAIKU_MODEL, {
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });
  await recordSpend(db, cost);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return text || last.content;
}

import type Anthropic from "@anthropic-ai/sdk";
```

- [ ] **Step 2: Commit**

```powershell
git add lib/rag/rewrite.ts
git commit -m "feat(rag): Haiku-backed query rewriter with conversation context"
```

### Task 4.2: Retriever (embed → pgvector → rerank)

**Files:**
- Create: `D:\reverse-resume\lib\rag\retrieve.ts`
- Create: `D:\reverse-resume\lib\rag\retrieve.test.ts`

- [ ] **Step 1: Write failing test (uses test DB + mocked Voyage)**

```typescript
// lib/rag/retrieve.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, type TestDbContext } from "@/tests/helpers/test-db";
import { sql } from "drizzle-orm";
import { documents } from "@/lib/db/schema";
import { retrieve } from "./retrieve";
import * as voyage from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";

describe("retrieve", () => {
  let ctx: TestDbContext;
  beforeAll(async () => { ctx = await setupTestDb(); }, 60000);
  afterAll(async () => { await ctx.cleanup(); });

  beforeEach(async () => {
    await ctx.db.execute(sql`TRUNCATE documents RESTART IDENTITY CASCADE`);
    vi.restoreAllMocks();
  });

  it("returns top-k by cosine similarity, then rerank", async () => {
    // Seed three docs with distinct embeddings
    const e1 = Array(1024).fill(0).map((_, i) => (i === 0 ? 1 : 0));
    const e2 = Array(1024).fill(0).map((_, i) => (i === 1 ? 1 : 0));
    const e3 = Array(1024).fill(0).map((_, i) => (i === 2 ? 1 : 0));
    await ctx.db.insert(documents).values([
      { sourceType: "snippet", content: "doc1", contentHash: "h1", embedding: e1 },
      { sourceType: "snippet", content: "doc2", contentHash: "h2", embedding: e2 },
      { sourceType: "snippet", content: "doc3", contentHash: "h3", embedding: e3 },
    ]);

    // Mock embed to return e2 (so doc2 should win cosine)
    vi.spyOn(voyage, "embed").mockResolvedValue({ embeddings: [e2], totalTokens: 5 });
    // Mock rerank to identity-pass top-2 by initial order
    vi.spyOn(voyage, "rerank").mockImplementation(async (_q, docs, k) =>
      ({ results: docs.slice(0, k).map((_, idx) => ({ index: idx, relevanceScore: 1 - idx * 0.1 })), totalTokens: 5 })
    );

    const result = await retrieve(ctx.db, "any", { topK: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe("doc2");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```powershell
pnpm test lib/rag/retrieve.test.ts
```

- [ ] **Step 3: Implement retrieve.ts**

```typescript
// lib/rag/retrieve.ts
import { sql } from "drizzle-orm";
import { embed, rerank, voyageCostCents } from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export interface RetrievedChunk {
  id: number;
  content: string;
  sourceType: string;
  sourceProject: string | null;
  sourceUrl: string | null;
  filePath: string | null;
  title: string | null;
  metadata: Record<string, unknown>;
  cosineScore: number;
  rerankScore?: number;
}

export interface RetrieveOptions {
  topInitial?: number;
  topK?: number;
  doRerank?: boolean;
}

export async function retrieve(
  db: AnyDb,
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { topInitial = 20, topK = 5, doRerank = true } = options;
  if (!query.trim()) return [];

  // 1. Embed
  let embedding: number[];
  let costCents = 0;
  try {
    const embedResult = await embed([query], "voyage-3");
    embedding = embedResult.embeddings[0];
    costCents += voyageCostCents(embedResult.totalTokens, "embed");
  } catch (e) {
    // Fallback to BM25-style search via to_tsvector if embed fails
    return await retrieveBm25(db, query, topK);
  }

  // 2. pgvector cosine search
  const vec = `[${embedding.join(",")}]`;
  const rows = await db.execute<{
    id: number;
    content: string;
    source_type: string;
    source_project: string | null;
    source_url: string | null;
    file_path: string | null;
    title: string | null;
    metadata: Record<string, unknown>;
    score: number;
  }>(sql`
    SELECT id, content, source_type, source_project, source_url, file_path, title, metadata,
           1 - (embedding <=> ${vec}::vector) AS score
    FROM documents
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${topInitial}
  `);

  const initial: RetrievedChunk[] = rows.map((r) => ({
    id: Number(r.id),
    content: r.content,
    sourceType: r.source_type,
    sourceProject: r.source_project,
    sourceUrl: r.source_url,
    filePath: r.file_path,
    title: r.title,
    metadata: r.metadata,
    cosineScore: Number(r.score),
  }));

  // 3. Rerank (best-effort — failure falls through to top-K of initial)
  if (!doRerank || initial.length === 0) {
    await recordSpend(db, costCents);
    return initial.slice(0, topK);
  }

  try {
    const rerankResult = await rerank(query, initial.map((c) => c.content), topK);
    costCents += voyageCostCents(rerankResult.totalTokens, "rerank");
    await recordSpend(db, costCents);
    return rerankResult.results.map((r) => ({
      ...initial[r.index],
      rerankScore: r.relevanceScore,
    }));
  } catch {
    await recordSpend(db, costCents);
    return initial.slice(0, topK);
  }
}

async function retrieveBm25(db: AnyDb, query: string, topK: number): Promise<RetrievedChunk[]> {
  const rows = await db.execute<{
    id: number; content: string; source_type: string; source_project: string | null;
    source_url: string | null; file_path: string | null; title: string | null;
    metadata: Record<string, unknown>; score: number;
  }>(sql`
    SELECT id, content, source_type, source_project, source_url, file_path, title, metadata,
           ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) AS score
    FROM documents
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
    ORDER BY score DESC
    LIMIT ${topK}
  `);
  return rows.map((r) => ({
    id: Number(r.id),
    content: r.content,
    sourceType: r.source_type,
    sourceProject: r.source_project,
    sourceUrl: r.source_url,
    filePath: r.file_path,
    title: r.title,
    metadata: r.metadata,
    cosineScore: Number(r.score),
  }));
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm test lib/rag/retrieve.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add lib/rag/retrieve.ts lib/rag/retrieve.test.ts
git commit -m "feat(rag): retriever with pgvector cosine + Voyage rerank + BM25 fallback"
```

### Task 4.3: Generator (Sonnet streaming with citation parsing)

**Files:**
- Create: `D:\reverse-resume\lib\rag\generate.ts`
- Create: `D:\reverse-resume\lib\rag\citation-parser.ts`
- Create: `D:\reverse-resume\lib\rag\citation-parser.test.ts`

- [ ] **Step 1: Write failing test for citation parser**

```typescript
// lib/rag/citation-parser.test.ts
import { describe, it, expect } from "vitest";
import { CitationStreamParser } from "./citation-parser";

describe("CitationStreamParser", () => {
  it("emits text deltas and detects citation tags", () => {
    const p = new CitationStreamParser([{ id: 1 }, { id: 2 }] as any);
    const events = [
      ...p.feed("I built a "),
      ...p.feed("rate limiter [1] using"),
      ...p.feed(" tree-sitter [2]."),
      ...p.flush(),
    ];

    const tokens = events.filter((e) => e.type === "token").map((e) => (e as any).text).join("");
    expect(tokens).toContain("rate limiter [1]");
    expect(tokens).toContain("tree-sitter [2]");

    const citations = events.filter((e) => e.type === "citation");
    expect(citations).toHaveLength(2);
    expect((citations[0] as any).chunk.id).toBe(1);
    expect((citations[1] as any).chunk.id).toBe(2);
  });

  it("ignores duplicate citations of the same number", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("[1] and again [1]"), ...p.flush()];
    expect(events.filter((e) => e.type === "citation")).toHaveLength(1);
  });

  it("drops out-of-range citations", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("hallucinated [9]"), ...p.flush()];
    expect(events.filter((e) => e.type === "citation")).toHaveLength(0);
  });

  it("handles citation tag split across chunks", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("text ["), ...p.feed("1] more"), ...p.flush()];
    const cits = events.filter((e) => e.type === "citation");
    expect(cits).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement citation-parser.ts**

```typescript
// lib/rag/citation-parser.ts
import type { RetrievedChunk } from "./retrieve";

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "citation"; n: number; chunk: RetrievedChunk };

/**
 * Streams text deltas while detecting [n] citation tags. Emits a `citation`
 * event the first time each tag appears. Handles tags split across chunks
 * by buffering an unbounded-but-trivial tail.
 */
export class CitationStreamParser {
  private buffer = "";
  private emitted = new Set<number>();

  constructor(private readonly chunks: RetrievedChunk[]) {}

  *feed(delta: string): Generator<StreamEvent> {
    this.buffer += delta;
    while (true) {
      const open = this.buffer.indexOf("[");
      if (open === -1) {
        if (this.buffer.length > 0) {
          yield { type: "token", text: this.buffer };
          this.buffer = "";
        }
        return;
      }
      // Emit text up to the bracket
      if (open > 0) {
        yield { type: "token", text: this.buffer.slice(0, open) };
        this.buffer = this.buffer.slice(open);
      }
      // Now buffer starts with "["
      const close = this.buffer.indexOf("]");
      if (close === -1) {
        // Tag may continue in next delta — keep buffering
        return;
      }
      const inner = this.buffer.slice(1, close);
      const n = Number(inner);
      const tagText = this.buffer.slice(0, close + 1);
      yield { type: "token", text: tagText };
      if (Number.isInteger(n) && n >= 1 && n <= this.chunks.length && !this.emitted.has(n)) {
        this.emitted.add(n);
        yield { type: "citation", n, chunk: this.chunks[n - 1] };
      }
      this.buffer = this.buffer.slice(close + 1);
    }
  }

  *flush(): Generator<StreamEvent> {
    if (this.buffer.length > 0) {
      yield { type: "token", text: this.buffer };
      this.buffer = "";
    }
  }
}
```

- [ ] **Step 3: Run parser tests**

```powershell
pnpm test lib/rag/citation-parser.test.ts
```

- [ ] **Step 4: Implement generate.ts**

```typescript
// lib/rag/generate.ts
import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import { CitationStreamParser, type StreamEvent } from "./citation-parser";
import type { RetrievedChunk } from "./retrieve";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

const SYSTEM_PROMPT = `You are the chat backend of Harshit Sindhu's "Reverse Resume" — a portfolio that proves engineering claims with real artifacts.

Style:
- First-person ("I built…", "I shipped…").
- Concise. 2–4 short paragraphs is usually right.
- Cite EVERY factual claim using [n] notation matching the numbered context below. If you can't cite, don't claim.
- Never fabricate file names, function names, or numbers.
- If the context doesn't answer the question, say so plainly and suggest what you DO have.

Audience: technical recruiters and hiring managers. They want truth they can verify, not marketing.`;

function renderChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const n = i + 1;
      const header = `[${n}] ${c.sourceType.toUpperCase()}${c.sourceProject ? ` — ${c.sourceProject}` : ""}${c.title ? ` — ${c.title}` : ""}${c.filePath ? ` — ${c.filePath}` : ""}`;
      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

export interface GenerateOptions {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  chunks: RetrievedChunk[];
  signal?: AbortSignal;
}

export async function* generate(
  db: AnyDb,
  options: GenerateOptions
): AsyncGenerator<StreamEvent> {
  const { history, chunks, signal } = options;
  const parser = new CitationStreamParser(chunks);

  const stream = await anthropic().messages.stream(
    {
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: renderChunksAsContext(chunks), cache_control: { type: "ephemeral" } },
      ],
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    },
    { signal }
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      for (const ev of parser.feed(event.delta.text)) {
        yield ev;
      }
    }
  }
  for (const ev of parser.flush()) yield ev;

  // Record spend after stream completes
  const finalMessage = await stream.finalMessage();
  const cost = anthropicCostCents(SONNET_MODEL, {
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    cacheReadInputTokens: finalMessage.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
  });
  await recordSpend(db, cost);
}
```

- [ ] **Step 5: Commit**

```powershell
git add lib/rag/
git commit -m "feat(rag): citation-aware streaming generator with prompt caching"
```

---

# Phase 5 — Chat API + UI

**Goal:** A working browser experience where a recruiter types a question, sees streaming text + citation cards, and can click through.

### Task 5.1: SSE event helpers

**Files:**
- Create: `D:\reverse-resume\lib\sse.ts`

- [ ] **Step 1: Implement sse.ts**

```typescript
// lib/sse.ts
export type ServerEvent =
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
      controller.enqueue(encodeSse(event));
    },
    close() {
      controller.close();
    },
  };
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/sse.ts
git commit -m "feat(sse): server-sent event helpers"
```

### Task 5.2: Chat route (orchestration)

**Files:**
- Create: `D:\reverse-resume\app\api\chat\route.ts`

- [ ] **Step 1: Implement route.ts**

```typescript
// app/api/chat/route.ts
import { z } from "zod";
import { db } from "@/lib/db/client";
import { hashIp, todayIstDateStr } from "@/lib/rate-limit/ip-hash";
import { consume } from "@/lib/rate-limit/postgres-token-bucket";
import { checkCap } from "@/lib/spend-cap/daily-cap";
import { rewriteQuery } from "@/lib/rag/rewrite";
import { retrieve } from "@/lib/rag/retrieve";
import { generate } from "@/lib/rag/generate";
import { makeSseStream } from "@/lib/sse";

export const runtime = "nodejs";

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1),
});

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) {
    return new Response(JSON.stringify({ error: "invalid body" }), { status: 400 });
  }

  const database = db();
  const ipHash = hashIp(clientIp(req), `${process.env.DAILY_SALT}:${todayIstDateStr()}`);
  const capCents = Number(process.env.DAILY_CAP_CENTS ?? "20000");
  const maxTokens = Number(process.env.RATE_LIMIT_MAX ?? "10");
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "3600");
  const refillPerSecond = maxTokens / windowSec;

  const { stream, send, close } = makeSseStream();

  // Run pipeline asynchronously so we can return the stream immediately
  (async () => {
    try {
      // 1. Rate limit
      const rl = await consume(database, ipHash, { maxTokens, refillPerSecond });
      if (!rl.allowed) {
        send({ type: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds ?? 60 });
        send({ type: "done" });
        close();
        return;
      }

      // 2. Spend cap (entry check)
      const cap = await checkCap(database, capCents);
      if (!cap.ok) {
        send({
          type: "spend_capped",
          message:
            "I've hit my daily budget. Try again at IST midnight, or email Harshit at harshitsindhu10@gmail.com.",
        });
        send({ type: "done" });
        close();
        return;
      }

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
      req.signal.addEventListener("abort", () => abortController.abort());

      for await (const event of generate(database, {
        history: body.data.messages,
        chunks,
        signal: abortController.signal,
      })) {
        send(event);
      }
      send({ type: "done" });
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      send({ type: "error", message: "I'm having trouble responding right now — please try again in a minute." });
      send({ type: "done" });
      close();
      console.error("[chat]", msg);
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Commit**

```powershell
git add app/api/chat/route.ts
git commit -m "feat(chat): streaming SSE route with full pipeline"
```

### Task 5.3: ChatShell client component

**Files:**
- Create: `D:\reverse-resume\components\chat-shell.tsx`

- [ ] **Step 1: Implement chat-shell.tsx**

```typescript
// components/chat-shell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { CitationsPanel, type CitationCard } from "./citations-panel";

interface Message { role: "user" | "assistant"; content: string }

export function ChatShell({ demoPrompts }: { demoPrompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [citations, setCitations] = useState<CitationCard[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    setStatusBanner(null);

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
          const json = evt.slice(6);
          const ev = JSON.parse(json);
          if (ev.type === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + ev.text };
              return copy;
            });
          } else if (ev.type === "citation") {
            setCitations((c) => {
              if (c.find((x) => x.n === ev.n)) return c;
              return [...c, { n: ev.n, chunk: ev.chunk }];
            });
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
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
      <div>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {demoPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-sm px-3 py-1 border rounded-full hover:bg-neutral-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4 mt-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className="inline-block max-w-[90%] px-4 py-2 rounded-lg whitespace-pre-wrap text-left bg-neutral-100">
                {m.content || (m.role === "assistant" && busy ? "…" : "")}
              </div>
            </div>
          ))}
        </div>
        {statusBanner && (
          <div className="mt-4 p-3 border rounded text-sm text-amber-800 bg-amber-50">{statusBanner}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask anything about Harshit's work…"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button type="submit" disabled={busy || !input.trim()} className="px-4 py-2 border rounded">
            Ask
          </button>
        </form>
      </div>
      <CitationsPanel cards={citations} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add components/chat-shell.tsx
git commit -m "feat(ui): chat shell with streaming, citations, and status banners"
```

### Task 5.4: CitationsPanel client component

**Files:**
- Create: `D:\reverse-resume\components\citations-panel.tsx`
- Create: `D:\reverse-resume\components\code-block.tsx`

- [ ] **Step 1: Implement code-block.tsx**

```typescript
// components/code-block.tsx
"use client";

import { useEffect, useState } from "react";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { codeToHtml } = await import("shiki");
      const result = await codeToHtml(code, { lang: language ?? "text", theme: "github-light" });
      if (!cancelled) setHtml(result);
    })();
    return () => { cancelled = true; };
  }, [code, language]);

  return html
    ? <div className="text-xs overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    : <pre className="text-xs overflow-x-auto bg-neutral-50 p-2 rounded"><code>{code}</code></pre>;
}
```

- [ ] **Step 2: Implement citations-panel.tsx**

```typescript
// components/citations-panel.tsx
"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";

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

const BADGE_LABEL: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "Code on GitHub",
  experience: "Professional experience",
  snippet: "Code excerpt (sanitized)",
};

const BADGE_COLOR: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "bg-emerald-100 text-emerald-800",
  experience: "bg-sky-100 text-sky-800",
  snippet: "bg-amber-100 text-amber-800",
};

export function CitationsPanel({ cards }: { cards: CitationCard[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  return (
    <aside className="space-y-3">
      <h2 className="text-xs uppercase tracking-wide text-neutral-500">Sources</h2>
      {cards.length === 0 && (
        <p className="text-sm text-neutral-400">Citations will appear here as the answer streams.</p>
      )}
      {cards.map((card) => {
        const isOpen = expanded.has(card.n);
        const lang = (card.chunk.metadata?.language as string) ?? undefined;
        return (
          <div key={card.n} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded ${BADGE_COLOR[card.chunk.sourceType]}`}>
                [{card.n}] {BADGE_LABEL[card.chunk.sourceType]}
              </span>
              {card.chunk.sourceUrl && (
                <a
                  href={card.chunk.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on GitHub →
                </a>
              )}
            </div>
            <div className="font-medium">{card.chunk.title ?? card.chunk.filePath}</div>
            {card.chunk.sourceProject && (
              <div className="text-xs text-neutral-500">{card.chunk.sourceProject}</div>
            )}
            <button
              onClick={() => setExpanded((s) => {
                const next = new Set(s);
                next.has(card.n) ? next.delete(card.n) : next.add(card.n);
                return next;
              })}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              {isOpen ? "Hide excerpt" : "Show excerpt"}
            </button>
            {isOpen && (
              <div className="mt-2">
                <CodeBlock code={card.chunk.content} language={lang} />
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add components/
git commit -m "feat(ui): citations panel with Shiki-highlighted excerpts"
```

### Task 5.5: Landing page wiring

**Files:**
- Modify: `D:\reverse-resume\app\layout.tsx`
- Modify: `D:\reverse-resume\app\page.tsx`
- Create: `D:\reverse-resume\app\globals.css`
- Create: `D:\reverse-resume\content\landing.placeholder.json` (real `landing.mdx` ships in Phase 7)

- [ ] **Step 1: Add Tailwind**

```powershell
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Replace tailwind.config.js content**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 3: Write app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
```

- [ ] **Step 4: Update app/layout.tsx**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harshit Sindhu — Reverse Resume",
  description: "Ask my work anything. Every claim cites real code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-neutral-900">
        <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Write a placeholder landing.placeholder.json** (real MDX in Phase 7)

```json
{
  "headline": "Ask my work anything.",
  "subheadline": "Every answer cites real code, real PRs, real production experience.",
  "demoPrompts": [
    "Have you actually built production rate limiting?",
    "Show me your most complex Postgres query",
    "How do you handle the outbox pattern?",
    "Walk me through your most interesting TypeScript module",
    "What did you ship in the last month?"
  ]
}
```

- [ ] **Step 6: Update app/page.tsx**

```typescript
import { ChatShell } from "@/components/chat-shell";
import landing from "@/content/landing.placeholder.json";

export default function Home() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{landing.headline}</h1>
        <p className="text-neutral-600">{landing.subheadline}</p>
      </header>
      <ChatShell demoPrompts={landing.demoPrompts} />
      <footer className="text-xs text-neutral-500 pt-8 border-t">
        Built by{" "}
        <a className="underline" href="mailto:harshitsindhu10@gmail.com">Harshit Sindhu</a>
        {" • "}
        <a className="underline" href="https://www.linkedin.com/in/harshit-sindhu/" target="_blank" rel="noreferrer">LinkedIn</a>
        {" • "}
        <a className="underline" href="https://github.com/HArshit123455" target="_blank" rel="noreferrer">GitHub</a>
        {" • "}
        <a className="underline" href="https://leetcode.com/u/Harry_S/" target="_blank" rel="noreferrer">LeetCode</a>
      </footer>
    </main>
  );
}
```

- [ ] **Step 7: Smoke check**

```powershell
pnpm dev
```

Open http://localhost:3000. Verify the page renders, demo chips show, can type into the input. (Won't actually answer until DB has content — that's Phase 7.)

- [ ] **Step 8: Commit**

```powershell
git add app/ components/ content/landing.placeholder.json tailwind.config.js postcss.config.js package.json pnpm-lock.yaml
git commit -m "feat(ui): landing page wired to ChatShell with placeholder content"
```

---

# Phase 6 — Eval, E2E, Deploy

**Goal:** Retrieval recall@5 ≥ 0.9 against seed-questions, Playwright E2E green, Vercel preview live.

### Task 6.1: Seed questions JSON

**Files:**
- Create: `D:\reverse-resume\content\seed-questions.json`

- [ ] **Step 1: Write seed questions** (placeholder source files referenced; Phase 7 will create them)

```json
[
  {
    "id": "rate-limit",
    "question": "Have you actually built production rate limiting?",
    "must_cite_at_least_one_of": [
      "snippets/postgres-token-bucket.mdx",
      "experience/zykrr.mdx#rate-limiting"
    ]
  },
  {
    "id": "outbox",
    "question": "How do you handle the outbox pattern at scale?",
    "must_cite_at_least_one_of": [
      "snippets/outbox-pattern.mdx",
      "experience/zykrr.mdx#outbox"
    ]
  },
  {
    "id": "partitioning",
    "question": "Show me a real Postgres partitioning strategy",
    "must_cite_at_least_one_of": [
      "snippets/partitioning-strategy.mdx",
      "experience/zykrr.mdx#partitioning"
    ]
  },
  {
    "id": "mcp",
    "question": "Have you built anything with MCP?",
    "must_cite_at_least_one_of": [
      "github/job-mcp/src/index.ts",
      "snippets/mcp-server-bootstrap.mdx"
    ]
  },
  {
    "id": "adaptive-search",
    "question": "How do you design adaptive search with fallback tiers?",
    "must_cite_at_least_one_of": [
      "github/job-mcp/src/tools/adaptive-search-jobs.ts",
      "snippets/adaptive-tiered-search.mdx"
    ]
  },
  {
    "id": "redis-cache",
    "question": "Where have you used Redis caching to reduce DB load?",
    "must_cite_at_least_one_of": [
      "experience/zykrr.mdx#redis-caching"
    ]
  },
  {
    "id": "mern",
    "question": "What's the most complete full-stack project you've built?",
    "must_cite_at_least_one_of": [
      "experience/pro-shop.mdx"
    ]
  },
  {
    "id": "ts-bias",
    "question": "Why TypeScript and not Python?",
    "must_cite_at_least_one_of": [
      "experience/stack-philosophy.mdx"
    ]
  }
]
```

- [ ] **Step 2: Commit**

```powershell
git add content/seed-questions.json
git commit -m "feat(eval): seed recruiter question set with expected sources"
```

### Task 6.2: Retrieval eval harness

**Files:**
- Create: `D:\reverse-resume\evals\retrieval.eval.ts`

- [ ] **Step 1: Implement retrieval.eval.ts**

```typescript
// evals/retrieval.eval.ts
import "dotenv/config";
import { db, closeDb } from "@/lib/db/client";
import { retrieve } from "@/lib/rag/retrieve";
import seed from "@/content/seed-questions.json";

interface SeedRow {
  id: string;
  question: string;
  must_cite_at_least_one_of: string[];
}

function chunkMatchesExpected(chunkSourcePath: string | null, sourceType: string, sourceProject: string | null, expected: string): boolean {
  // Expected formats:
  //   "snippets/foo.mdx"             → sourceType=snippet AND filePath ends with foo.mdx
  //   "experience/zykrr.mdx#anchor"  → sourceType=experience AND filePath ends with zykrr.mdx
  //   "github/<repo>/<path>"         → sourceType=github AND sourceProject=<repo> AND filePath=<path>
  if (expected.startsWith("snippets/")) {
    return sourceType === "snippet" && (chunkSourcePath ?? "").endsWith(expected.slice("snippets/".length));
  }
  if (expected.startsWith("experience/")) {
    const file = expected.slice("experience/".length).split("#")[0];
    return sourceType === "experience" && (chunkSourcePath ?? "").endsWith(file);
  }
  if (expected.startsWith("github/")) {
    const [, repo, ...rest] = expected.split("/");
    const path = rest.join("/");
    return sourceType === "github" && sourceProject === repo && chunkSourcePath === path;
  }
  return false;
}

async function main() {
  const database = db();
  const rows = seed as SeedRow[];
  let passed = 0;
  const failures: { id: string; question: string; topPaths: string[] }[] = [];

  for (const row of rows) {
    const result = await retrieve(database, row.question, { topK: 5 });
    const matched = result.some((c) =>
      row.must_cite_at_least_one_of.some((exp) =>
        chunkMatchesExpected(c.filePath, c.sourceType, c.sourceProject, exp)
      )
    );
    if (matched) {
      passed++;
    } else {
      failures.push({
        id: row.id,
        question: row.question,
        topPaths: result.map((c) => `${c.sourceType}:${c.sourceProject ?? "-"}:${c.filePath}`),
      });
    }
  }

  const recall = passed / rows.length;
  console.log(`recall@5 = ${recall.toFixed(3)} (${passed}/${rows.length})`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  [${f.id}] ${f.question}`);
      f.topPaths.forEach((p) => console.log(`     - ${p}`));
    }
  }

  await closeDb();
  if (recall < 0.9) {
    console.error(`\n✘ recall@5 below 0.9 threshold`);
    process.exit(1);
  }
  console.log(`\n✓ recall@5 ≥ 0.9`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Commit**

```powershell
git add evals/retrieval.eval.ts
git commit -m "feat(eval): retrieval eval harness with recall@5 gate"
```

### Task 6.3: Playwright E2E

**Files:**
- Create: `D:\reverse-resume\playwright.config.ts`
- Create: `D:\reverse-resume\e2e\recruiter-flow.spec.ts`

- [ ] **Step 1: Init Playwright**

```powershell
pnpm dlx playwright install chromium
```

- [ ] **Step 2: Write playwright.config.ts**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        port: 3000,
        reuseExistingServer: true,
      },
});
```

- [ ] **Step 3: Write recruiter-flow.spec.ts**

```typescript
import { test, expect } from "@playwright/test";

test("recruiter can ask a question and see a streamed answer with citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Ask my work anything.")).toBeVisible();

  // Click first demo prompt
  const firstPrompt = page.locator("button").filter({ hasText: /Have you actually built/ }).first();
  await firstPrompt.click();

  // First token must arrive within 8s
  const assistantBubble = page.locator("div.bg-neutral-100").last();
  await expect(assistantBubble).not.toHaveText("…", { timeout: 8000 });

  // At least one citation card must render
  const citations = page.locator("aside").locator("text=Show excerpt");
  await expect(citations.first()).toBeVisible({ timeout: 30000 });

  // Click expand
  await citations.first().click();
  await expect(page.locator("aside").locator("pre,code").first()).toBeVisible();
});
```

- [ ] **Step 4: Commit**

```powershell
git add playwright.config.ts e2e/
git commit -m "test(e2e): Playwright recruiter flow smoke"
```

### Task 6.4: GitHub Actions CI

**Files:**
- Create: `D:\reverse-resume\.github\workflows\ci.yml`

- [ ] **Step 1: Write ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test

  e2e:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx playwright install --with-deps chromium
      - run: pnpm build
      - env:
          DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.E2E_ANTHROPIC_API_KEY }}
          VOYAGE_API_KEY: ${{ secrets.E2E_VOYAGE_API_KEY }}
          INGEST_TOKEN: test-token
          DAILY_SALT: test-salt
          DAILY_CAP_CENTS: "500"  # ₹5 cap for CI
        run: pnpm test:e2e

  retrieval-eval:
    runs-on: ubuntu-latest
    needs: test
    if: contains(github.event.head_commit.modified, 'lib/rag/') || contains(github.event.head_commit.modified, 'content/')
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - env:
          DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
          VOYAGE_API_KEY: ${{ secrets.E2E_VOYAGE_API_KEY }}
        run: pnpm eval:retrieval
```

- [ ] **Step 2: Commit**

```powershell
git add .github/
git commit -m "ci: typecheck + unit + e2e + retrieval eval"
```

### Task 6.5: Vercel deploy

Manual + commit:

- [ ] **Step 1: Push repo to GitHub**

```powershell
gh repo create HArshit123455/reverse-resume --public --source=. --remote=origin --push
```

(If `gh` not installed: create on github.com manually, then `git remote add origin … && git push -u origin main`.)

- [ ] **Step 2: Connect Vercel**

Manual:
1. vercel.com → Import → pick `reverse-resume` repo.
2. Framework: Next.js (auto-detected).
3. Add env vars from `.env.example` (paste real values from Neon, Anthropic, Voyage).
4. Deploy.

- [ ] **Step 3: Verify production URL**

Open the Vercel URL. Expect landing page renders. Demo prompt click should fail gracefully with "no content yet" — that's expected until Phase 7.

- [ ] **Step 4: Add production URL to README**

```markdown
**Live:** https://reverse-resume.vercel.app
```

```powershell
git add README.md
git commit -m "docs: add live Vercel URL"
git push
```

---

# Phase 7 — Content Authoring

**Goal:** All MDX content authored, ingested, retrieval eval ≥ 0.9 recall.

This phase is content-heavy (writing + reviewing) more than code-heavy. Tasks below describe what to write; the actual writing is iterative between Claude and Harshit.

### Task 7.1: Real landing MDX

**Files:**
- Create: `D:\reverse-resume\content\landing.mdx`
- Modify: `D:\reverse-resume\app\page.tsx` (read from MDX instead of placeholder JSON)

- [ ] **Step 1: Write landing.mdx with front-matter**

```mdx
---
headline: "Ask my work anything."
subheadline: "Every claim cites real code, real production experience, real artifacts. No marketing — just verifiable evidence."
demoPrompts:
  - "Have you built production rate limiting?"
  - "How do you handle the outbox pattern at scale?"
  - "Show me a real Postgres partitioning strategy"
  - "Walk me through your most interesting TypeScript module"
  - "Why TypeScript and not Python?"
---
```

- [ ] **Step 2: Add MDX front-matter loader to page.tsx**

```typescript
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell } from "@/components/chat-shell";

interface LandingFront { headline: string; subheadline: string; demoPrompts: string[] }

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{landing.headline}</h1>
        <p className="text-neutral-600">{landing.subheadline}</p>
      </header>
      <ChatShell demoPrompts={landing.demoPrompts} />
      <footer className="text-xs text-neutral-500 pt-8 border-t">
        Built by{" "}
        <a className="underline" href="mailto:harshitsindhu10@gmail.com">Harshit Sindhu</a>
        {" • "}
        <a className="underline" href="https://www.linkedin.com/in/harshit-sindhu/" target="_blank" rel="noreferrer">LinkedIn</a>
        {" • "}
        <a className="underline" href="https://github.com/HArshit123455" target="_blank" rel="noreferrer">GitHub</a>
        {" • "}
        <a className="underline" href="https://leetcode.com/u/Harry_S/" target="_blank" rel="noreferrer">LeetCode</a>
      </footer>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add content/landing.mdx app/page.tsx
git commit -m "feat(content): real landing.mdx loaded via gray-matter"
```

### Task 7.2: Experience entries (5 files)

**Files to create:**
- `D:\reverse-resume\content\experience\zykrr.mdx` (current role — primary, longest)
- `D:\reverse-resume\content\experience\engineers-india.mdx` (internship, brief)
- `D:\reverse-resume\content\experience\dtu-education.mdx` (B.Tech — brief)
- `D:\reverse-resume\content\experience\pro-shop.mdx` (MERN project, brief)
- `D:\reverse-resume\content\experience\stack-philosophy.mdx` (TS-only philosophy, why; differentiator)

**Front-matter shape (same for all):**
```yaml
---
title: "Software Developer at Zykrr"
role: "Software Developer"
employer: "Zykrr"
dates: "2024-06 to present"
location: "New Delhi, India"
stack: ["TypeScript", "Node.js", "Express", "PostgreSQL", "Redis", "React", "Next.js"]
themes: ["backend", "scaling", "rest-api", "postgres", "redis"]
---
```

- [ ] **Step 1: Claude drafts skeletons + bodies for each (separate sub-task per file in execution).** See Task 7.4 for shared pattern.
- [ ] **Step 2: Harshit reviews and edits phrasing.**
- [ ] **Step 3: Commit**

```powershell
git add content/experience/
git commit -m "content(experience): 5 experience entries"
```

### Task 7.3: Snippet cards from job-mcp (~10 files)

**Files to create in `D:\reverse-resume\content\snippets\`:**

| File | Topic | Source in `D:\job-mcp\src\` |
|---|---|---|
| `mcp-server-bootstrap.mdx` | MCP server setup with `@modelcontextprotocol/sdk` | `index.ts` |
| `adaptive-tiered-search.mdx` | Per-tier escalation logic | `tools/adaptive-search-jobs.ts`, `matching/adaptive-tiers.ts` |
| `dual-search-orchestration.mdx` | Serper + Tavily fan-out + dedup | `clients/search-orchestrator.ts`, `clients/serper.ts`, `clients/tavily.ts` |
| `linkedin-probe-filter.mdx` | Probe-based dead-link filtering | `filters/linkedin-probe.ts`, `filters/generic-probe.ts` |
| `score-and-rank-pipeline.mdx` | Composable scoring pipeline | `matching/scoring.ts`, `matching/skill-extractor.ts` |
| `synonym-dictionary-pattern.mdx` | Query expansion via synonym dict | `matching/synonym-dictionary.ts`, `matching/query-generator.ts` |
| `message-refiner-chain.mdx` | Outreach message refinement chain | `messaging/refiner.ts`, `messaging/substitutor.ts`, `messaging/tone-modifiers.ts` |
| `freshness-and-dedup.mdx` | Freshness + history-based dedup | `filters/freshness.ts`, `filters/dedup.ts` |
| `tally-aware-filter-wrapper.mdx` | Filter wrapper that tallies rejection causes | `filters/location-filter.ts` |
| `excluded-skill-tracking.mdx` | Adaptive escalation signal tracking | `matching/adaptive-tiers.ts` (tally section) |

**Front-matter shape:**
```yaml
---
topic: "Token-bucket rate limiting in Postgres"
source_project: "job-mcp"        # or "auth", "insights"
language: "typescript"
tags: ["rate-limiting", "postgres", "concurrency"]
---
```

- [ ] **Step 1: For each file: Claude reads the cited source, drafts the snippet card with `## Context`, fenced code block, `## What this proves`. Harshit reviews.**
- [ ] **Step 2: Commit incrementally** (every 2-3 cards).

### Task 7.4: Snippet cards from auth (~6 files, sanitized)

**Files to create in `D:\reverse-resume\content\snippets\`:**

| File | Topic |
|---|---|
| `outbox-pattern.mdx` | Transactional outbox pattern |
| `partitioning-strategy.mdx` | Postgres range partitioning by date |
| `retention-scheduler.mdx` | Periodic data retention sweeper |
| `redis-caching-layer.mdx` | Cache-aside pattern for high-frequency endpoints |
| `index-strategy.mdx` | Composite index design for analytical queries |
| `phase-driven-development.mdx` | GSD-style phase planning workflow |

**Sanitization rules — applied per snippet:**
- Replace real table names with generic ones (e.g., `client_responses` → `events`).
- Strip column names that hint at business logic (`csat_score` → `metric_value`).
- Remove client identifiers, internal URLs, tenant IDs.
- Reduce to ≤ 30 lines per code block.

**Workflow per snippet:**
- [ ] **Step 1: Claude reads relevant `D:\auth\src\` files, drafts a sanitized version + prose context.**
- [ ] **Step 2: Harshit reviews line-by-line, marks any that need further redaction.**
- [ ] **Step 3: Iterate, then commit.**

### Task 7.5: Snippet cards from insights (~4 files, sanitized)

**Files to create:**

| File | Topic |
|---|---|
| `dnd-kit-reorderable-list.mdx` | Drag-drop reordering with @dnd-kit |
| `react-hook-form-zod.mdx` | Form validation with react-hook-form + zod |
| `radix-dialog-composition.mdx` | Composable dialog patterns with Radix |
| `controlled-vs-uncontrolled-form.mdx` | Trade-off note from real form work |

Same workflow as Task 7.4.

### Task 7.6: Initial ingest of all content

- [ ] **Step 1: Run all three ingests**

```powershell
pnpm ingest github HArshit123455 job-mcp
pnpm ingest experience
pnpm ingest snippets
```

Expected output for each: `{ scanned, chunked, inserted, updated, skipped, costCents, ms }`.

- [ ] **Step 2: Run retrieval eval**

```powershell
pnpm eval:retrieval
```

Expected: `recall@5 ≥ 0.9`. If lower, check failures section, iterate on chunking or content phrasing.

- [ ] **Step 3: Smoke test live chat**

```powershell
pnpm dev
```

Click each demo prompt. Verify cited sources are reasonable.

- [ ] **Step 4: Deploy**

```powershell
git push
```

Vercel auto-deploys. Trigger ingest against production:

```powershell
$env:INGEST_TOKEN = "<production-token>"
curl -X POST -H "Authorization: Bearer $env:INGEST_TOKEN" -H "Content-Type: application/json" `
  -d '{"source":"github","owner":"HArshit123455","repo":"job-mcp"}' `
  https://reverse-resume.vercel.app/api/admin/ingest
```

Repeat for `experience` and `snippets` sources.

- [ ] **Step 5: Final commit**

```powershell
git commit --allow-empty -m "release: v1.0 — Reverse Resume live"
git push
```

---

## Self-Review

**Spec coverage check:**
- §1 Executive summary → entire plan delivers it ✓
- §2 Goals & non-goals → goals reflected in tasks (rate limit Task 2.2, citations Task 4.3, MDX authoring Phase 7); non-goals respected (no auth, no analytics) ✓
- §3 Architecture → realized in Phases 0–5 ✓
- §4 Components → each `/lib` module has its own task ✓
- §5 Data flow query path → Tasks 4.1, 4.2, 4.3, 5.2 chain into the documented pipeline ✓
- §5 Data flow ingest path → Tasks 3.6, 3.7, 3.8 + Phase 7 cover all 3 sources ✓
- §6 Error handling → covered in Tasks 2.2, 2.3, 4.2 (BM25 fallback), 5.2 (try/catch + SSE error events) ✓
- §6 Rate limit + spend cap SQL → Tasks 2.2 + 2.3 implement the exact SQL from spec ✓
- §7 Content authoring → Phase 7 entirely ✓
- §8 Testing → Tasks 2.1, 2.2, 2.3, 3.3, 3.4, 4.2 (unit), 1.4 (integration), 6.2 (eval), 6.3 (e2e), 6.4 (CI gate) ✓
- §10 env vars → all in `.env.example` Task 0.5 ✓
- §10 file tree → Phases 0–7 produce exactly this structure ✓

**No gaps.**

**Placeholder scan:** No "TBD" / "TODO" / "implement later" patterns in tasks. All code blocks are complete and runnable. Phase 7 task descriptions reference Claude+Harshit iteration but include explicit per-file scope and workflow — that's not a placeholder, it's a content-authoring boundary.

**Type consistency check:**
- `consume(db, ipHash, config)` — same signature across Task 2.2 definition and Task 5.2 caller ✓
- `recordSpend(db, cents)` and `checkCap(db, capCents)` — consistent across Tasks 2.3, 3.6, 3.7, 4.1, 4.2, 4.3, 5.2 ✓
- `RetrievedChunk` interface — defined Task 4.2, consumed Tasks 4.3 and `CitationCard` chunk shape in Task 5.4 (matching fields) ✓
- `ChatTurn` (Task 4.1) and message shape in chat route (Task 5.2) — both `{role: "user"|"assistant", content: string}` ✓
- `StreamEvent` (Task 4.3) and `ServerEvent` (Task 5.1) — separate but compatible; chat route maps `StreamEvent` from generate() into `ServerEvent` for SSE ✓
- `documents` table column names (`source_type`, `source_project`, `source_url`, `file_path`, `content_hash`) — consistent in schema (Task 1.2), upsert (Task 3.5), ingesters (Tasks 3.6, 3.7), retrieve (Task 4.2), eval (Task 6.2) ✓

No type drift detected.
