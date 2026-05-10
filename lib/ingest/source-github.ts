import { Octokit } from "@octokit/rest";
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

    scanned++;
    const blob = await oct.git.getBlob({ owner, repo, file_sha: entry.sha! });
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

  const BATCH = 64;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const result = await embed(batch.map((c) => c.row.content), "voyage-code-3");
    batch.forEach((c, j) => {
      c.row.embedding = result.embeddings[j];
    });
    costCents += voyageCostCents(result.totalTokens, "embed");
  }

  await recordSpend(db, costCents);
  const upsertResult = await upsertDocuments(db, allChunks.map((c) => c.row));

  return {
    scanned,
    chunked,
    ...upsertResult,
    costCents,
    ms: Date.now() - start,
  };
}
