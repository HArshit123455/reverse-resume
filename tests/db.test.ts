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
