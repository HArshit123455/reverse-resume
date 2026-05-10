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
