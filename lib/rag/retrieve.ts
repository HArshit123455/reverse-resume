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
    costCents += voyageCostCents(embedResult.totalTokens, "voyage-3");
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
    costCents += voyageCostCents(rerankResult.totalTokens, "rerank-2");
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
