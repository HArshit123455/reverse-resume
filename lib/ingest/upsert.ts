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
  const skipped = 0;

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
