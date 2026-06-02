import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const ExperienceFrontmatter = z.object({
  title: z.string().min(1).max(120),
  role: z.string().min(1).max(80),
  employer: z.string().min(1).max(80),
  dates: z.string().min(1).max(40).optional(),
  location: z.string().min(1).max(80).optional(),
  stack: z.array(z.string().min(1).max(40)).max(20).default([]),
});

export type ExperienceFrontmatterT = z.infer<typeof ExperienceFrontmatter>;

function startYear(dates: string): number {
  const m = dates.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

export function _loadExperienceFrom(dir: string): ExperienceFrontmatterT[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  return files
    .map((f) => ExperienceFrontmatter.parse(matter(readFileSync(join(dir, f), "utf-8")).data))
    .filter((e) => e.employer !== "Personal" && !!e.dates)
    .sort((a, b) => startYear(b.dates as string) - startYear(a.dates as string));
}

export function loadExperience(): ExperienceFrontmatterT[] {
  return _loadExperienceFrom(join(process.cwd(), "content/experience"));
}
