import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db, closeDb } from "@/lib/db/client";
import { ingestRepo } from "@/lib/ingest/source-github";
import { ingestMdxDir } from "@/lib/ingest/source-mdx";
import { join } from "node:path";

async function main() {
  const [, , source, ...rest] = process.argv;
  const database = db();

  try {
    if (source === "github") {
      const [owner, repo] = rest;
      if (!owner || !repo) throw new Error("Usage: pnpm ingest github <owner> <repo>");
      const result = await ingestRepo(database, owner, repo);
      console.log(result);
    } else if (source === "experience") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/experience"), "experience");
      console.log(result);
    } else if (source === "snippets") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/snippets"), "snippet");
      console.log(result);
    } else {
      console.log("Usage: pnpm ingest <github|experience|snippets> [args]");
    }
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
