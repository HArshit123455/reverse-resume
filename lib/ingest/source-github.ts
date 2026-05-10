import { Octokit } from "@octokit/rest";
import { sql } from "drizzle-orm";
import { chunkCode } from "./chunk-code";
import { upsertDocuments } from "./upsert";
import { embed, voyageCostCents } from "@/lib/clients/voyage";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";
import type { NewDocument } from "@/lib/db/schema";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

const ALLOWED_EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".md": "markdown",
  ".sql": "sql",
};
const SKIP_PATH_SUBSTRINGS = ["/dist/", "/node_modules/", "/.next/", "/coverage/", "/.turbo/"];

export interface IngestRepoResult {
  scanned: number;
  chunked: number;
  inserted: number;
  updated: number;
  skipped: number;
  costCents: number;
  ms: number;
}

export async function ingestRepo(
  db: AnyDb,
  owner: string,
  repo: string
): Promise<IngestRepoResult> {
  const start = Date.now();
  const oct = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const repoInfo = await oct.repos.get({ owner, repo });
  const defaultBranch = repoInfo.data.default_branch;
  const ref = await oct.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const tree = await oct.git.getTree({
    owner,
    repo,
    tree_sha: ref.data.object.sha,
    recursive: "true",
  });

  let scanned = 0;
  let chunked = 0;
  let costCents = 0;
  const allChunks: Array<{ row: NewDocument }> = [];

  for (const entry of tree.data.tree) {
    if (entry.type !== "blob" || !entry.path) continue;
    const ext = "." + (entry.path.split(".").pop() ?? "").toLowerCase();
    const lang = ALLOWED_EXT_TO_LANG[ext];
    if (!lang) continue;
    if (SKIP_PATH_SUBSTRINGS.some((s) => `/${entry.path}`.includes(s))) continue;

    if (!entry.sha) continue;
    scanned++;
    const blob = await oct.git.getBlob({ owner, repo, file_sha: entry.sha });
    if (blob.data.encoding === "none") continue; // blob too large for API; skip rather than crash
    const source = Buffer.from(blob.data.content, blob.data.encoding as BufferEncoding).toString("utf-8");

    const chunks = chunkCode(source, entry.path, lang);
    chunked += chunks.length;
    for (const chunk of chunks) {
      const startLine = chunk.metadata.startLine ?? 1;
      const endLine = chunk.metadata.endLine ?? 1;
      const sourceUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${entry.path}#L${startLine}-L${endLine}`;
      allChunks.push({
        row: {
          sourceType: "github",
          sourceProject: repo,
          sourceUrl,
          filePath: entry.path,
          title: chunk.metadata.symbol ?? entry.path,
          content: chunk.content,
          contentHash: chunk.contentHash,
          metadata: chunk.metadata as Record<string, unknown>,
          embedding: [],
        },
      });
    }
  }

  // Pre-filter: skip chunks whose content_hash already exists in documents.
  // This is what makes re-runs cost ~zero — we don't pay Voyage for unchanged content.
  let preSkipped = 0;
  let newChunks = allChunks;
  if (allChunks.length > 0) {
    const hashes = allChunks.map((c) => c.row.contentHash);
    const existingRows = await db.execute<{ content_hash: string }>(sql`
      SELECT content_hash FROM documents WHERE content_hash = ANY(${hashes})
    `);
    const existingSet = new Set(existingRows.map((r) => r.content_hash));
    newChunks = allChunks.filter((c) => !existingSet.has(c.row.contentHash));
    preSkipped = allChunks.length - newChunks.length;
  }

  const BATCH = 64;
  for (let i = 0; i < newChunks.length; i += BATCH) {
    const batch = newChunks.slice(i, i + BATCH);
    const result = await embed(batch.map((c) => c.row.content), "voyage-code-3");
    batch.forEach((c, j) => {
      c.row.embedding = result.embeddings[j];
    });
    costCents += voyageCostCents(result.totalTokens, "voyage-code-3");
  }

  if (costCents > 0) await recordSpend(db, costCents);
  const upsertResult = await upsertDocuments(db, newChunks.map((c) => c.row));

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
