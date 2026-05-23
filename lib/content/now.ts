import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const NowItem = z.object({
  kind: z.enum(["Building", "Reading", "Learning", "Listening"]),
  title: z.string().min(1).max(80),
  desc: z.string().min(1).max(280),
});

export const NowFrontmatter = z.object({
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(NowItem).min(1).max(6),
});

export type NowFrontmatterT = z.infer<typeof NowFrontmatter>;

export function _loadNowFrom(dir: string): NowFrontmatterT {
  const raw = readFileSync(join(dir, "now.mdx"), "utf-8");
  return NowFrontmatter.parse(matter(raw).data);
}

export function loadNow(): NowFrontmatterT {
  return _loadNowFrom(join(process.cwd(), "content"));
}
