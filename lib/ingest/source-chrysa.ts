import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { join } from "node:path";
import { ChrysaFrontmatter } from "@/lib/content/chrysa";
import { docsFromMarkdown, storeChunks, type IngestMdxResult } from "./source-mdx";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export const CHRYSA_FILE = "content/chrysa.mdx";

/**
 * The Chrysa story as the chat should read it: the page body plus its "at a glance"
 * facts and dated timeline (which live in frontmatter, so the chunker would never see
 * them). Each `## ` section becomes one retrievable chunk.
 */
export function chrysaMarkdownForIngest(raw: string): string {
  const { data, content } = matter(raw);
  const fm = ChrysaFrontmatter.parse(data);

  const glance = fm.facts.map((f) => `- **${f.label}:** ${f.value}`).join("\n");
  const timeline = fm.timeline.map((t) => `- **${t.date} 2026:** ${t.event}`).join("\n");
  const links = fm.links.map((l) => `- ${l.label}: ${l.href}`).join("\n");

  return [
    "---",
    `title: "Chrysa: case study"`,
    `source_project: "chrysa"`,
    `tags: ["chrysa", "expo", "react-native", "mobile", "side-project", "case-study"]`,
    "---",
    "",
    "## Chrysa at a glance",
    "",
    `${fm.dek} ${fm.summary} The full story is on this site at /chrysa.`,
    "",
    glance,
    "",
    content.trim(),
    "",
    "## Chrysa timeline, day by day",
    "",
    timeline,
    ...(links ? ["", "## Chrysa links", "", links] : []),
    "",
  ].join("\n");
}

export async function ingestChrysa(
  db: AnyDb
): Promise<IngestMdxResult> {
  const start = Date.now();
  const raw = await readFile(join(process.cwd(), CHRYSA_FILE), "utf-8");
  const docs = docsFromMarkdown(chrysaMarkdownForIngest(raw), CHRYSA_FILE, "experience");
  const stored = await storeChunks(db, docs);
  return { scanned: 1, chunked: docs.length, ...stored, ms: Date.now() - start };
}
