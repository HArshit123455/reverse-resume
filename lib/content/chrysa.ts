import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const ChrysaFrontmatter = z.object({
  title: z.string().min(1).max(40),
  dek: z.string().min(1).max(160),
  summary: z.string().min(1).max(300),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  icon: z.string().min(1).max(200).optional(),
  facts: z.array(z.object({ label: z.string().min(1).max(40), value: z.string().min(1).max(120) })).max(12),
  timeline: z.array(z.object({ date: z.string().min(1).max(20), event: z.string().min(1).max(240) })).max(40),
  links: z
    .array(z.object({ label: z.string().min(1).max(40), href: z.string().regex(/^https?:\/\//) }))
    .max(6)
    .default([]),
});

export type ChrysaFrontmatterT = z.infer<typeof ChrysaFrontmatter>;

export interface ChrysaChapter {
  id: string;
  title: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Chapters are the body's `## ` headings, in order. */
export function chaptersOf(body: string): ChrysaChapter[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const title = line.slice(3).trim();
      return { id: slugify(title), title };
    });
}

/** ~230 words a minute, rounded up. */
export function readingMinutes(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 230));
}

export function _loadChrysaFrom(path: string) {
  const raw = readFileSync(path, "utf-8");
  const { data, content } = matter(raw);
  return {
    data: ChrysaFrontmatter.parse(data),
    body: content,
    chapters: chaptersOf(content),
    minutes: readingMinutes(content),
  };
}

export function loadChrysa() {
  return _loadChrysaFrom(join(process.cwd(), "content/chrysa.mdx"));
}
