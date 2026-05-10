import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { sql } from "drizzle-orm";
import { chunkMdx } from "./chunk-mdx";
import { upsertDocuments } from "./upsert";
import { embed, voyageCostCents } from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";
import type { NewDocument } from "@/lib/db/schema";

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
  const entries = await readdir(dir, { withFileTypes: true });
  const mdxFiles = entries
    .filter((e) => e.isFile() && (extname(e.name) === ".mdx" || extname(e.name) === ".md"))
    .map((e) => e.name);

  const allChunks: NewDocument[] = [];
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
        sourceProject: (chunk.metadata.source_project as string | undefined) ?? null,
        sourceUrl: null,
        filePath: chunk.metadata.filePath as string,
        title:
          (chunk.metadata.title as string | undefined) ??
          (chunk.metadata.heading as string | undefined) ??
          file,
        content: chunk.content,
        contentHash: chunk.contentHash,
        metadata: chunk.metadata,
        embedding: [],
      });
    }
  }

  // Pre-filter: skip chunks whose content_hash already exists. Idempotent re-runs cost ~zero.
  let preSkipped = 0;
  let newChunks = allChunks;
  if (allChunks.length > 0) {
    const hashes = allChunks.map((c) => c.contentHash);
    const existingRows = await db.execute<{ content_hash: string }>(sql`
      SELECT content_hash FROM documents WHERE content_hash = ANY(${hashes})
    `);
    const existingSet = new Set(existingRows.map((r) => r.content_hash));
    newChunks = allChunks.filter((c) => !existingSet.has(c.contentHash));
    preSkipped = allChunks.length - newChunks.length;
  }

  const BATCH = 64;
  let costCents = 0;
  for (let i = 0; i < newChunks.length; i += BATCH) {
    const batch = newChunks.slice(i, i + BATCH);
    const result = await embed(batch.map((c) => c.content), "voyage-3");
    batch.forEach((c, j) => {
      c.embedding = result.embeddings[j];
    });
    costCents += voyageCostCents(result.totalTokens, "voyage-3");
  }

  if (costCents > 0) await recordSpend(db, costCents);
  const upsertResult = await upsertDocuments(db, newChunks);

  return {
    scanned,
    chunked,
    inserted: upsertResult.inserted,
    updated: upsertResult.updated,
    skipped: upsertResult.skipped + preSkipped,
    costCents,
    ms: Date.now() - start,
  };
}
