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
    if (!embedResult.embeddings.length) {
      console.error("[retrieve] embed failed; falling back to BM25: empty embeddings array");
      return await retrieveBm25(db, query, topK);
    }
    embedding = embedResult.embeddings[0];
    costCents += voyageCostCents(embedResult.totalTokens, "voyage-3");
  } catch (err) {
    console.error("[retrieve] embed failed; falling back to BM25:", err);
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
    costCents += voyageCostCents(rerankResult.totalTokens, "rerank-2");
    await recordSpend(db, costCents);
    return rerankResult.results
      .filter((r) => r.index >= 0 && r.index < initial.length)
      .map((r) => ({ ...initial[r.index], rerankScore: r.relevanceScore }));
  } catch (err) {
    console.error("[retrieve] rerank failed; using cosine top-K:", err);
    await recordSpend(db, costCents);
    return initial.slice(0, topK);
  }
}

/**
 * Hydrate cached chunk-ids back to full RetrievedChunk rows. Preserves the
 * caller-supplied ordering — tab.ts depends on chunks[0] being the
 * highest-ranked chunk from the original retrieve() call. Rows no longer
 * present in the database are silently skipped. No spend recorded — this
 * is a single indexed SELECT, not a retrieval pass.
 */
export async function retrieveByIds(db: AnyDb, ids: number[]): Promise<RetrievedChunk[]> {
  if (ids.length === 0) return [];
  const rows = await db.execute<{
    id: number; content: string; source_type: string; source_project: string | null;
    source_url: string | null; file_path: string | null; title: string | null;
    metadata: Record<string, unknown>;
  }>(sql`
    SELECT id, content, source_type, source_project, source_url, file_path, title, metadata
    FROM documents
    WHERE id = ANY(${ids}::int[])
  `);
  const byId = new Map(rows.map((r) => [Number(r.id), r] as const));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined)
    .map((r) => ({
      id: Number(r.id),
      content: r.content,
      sourceType: r.source_type,
      sourceProject: r.source_project,
      sourceUrl: r.source_url,
      filePath: r.file_path,
      title: r.title,
      metadata: r.metadata,
      cosineScore: 0,
    }));
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
