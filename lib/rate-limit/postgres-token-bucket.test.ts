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
