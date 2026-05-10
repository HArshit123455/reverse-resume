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
