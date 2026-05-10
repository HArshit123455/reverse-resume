import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
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
  const entries = await readdir(dir);
  const mdxFiles = entries.filter((e) => extname(e) === ".mdx" || extname(e) === ".md");

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
