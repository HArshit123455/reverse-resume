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
  }, 120000);
});
