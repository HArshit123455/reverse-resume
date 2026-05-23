import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const ProjectStat = z.object({
  label: z.string().min(1).max(40),
  val: z.string().min(1).max(20),
});

export const ProjectFrontmatter = z.object({
  title: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  year: z.string().regex(/^\d{4}$/),
  kind: z.enum(["Side project", "OSS", "Bootstrapped", "Experiment"]),
  status: z.enum(["live", "archived"]),
  description: z.string().min(1).max(400),
  tags: z.array(z.string().min(1).max(40)).max(12),
  stats: z.array(ProjectStat).max(6).default([]),
  url: z.string().url().optional(),
  order: z.number().int().optional(),
});

export type ProjectFrontmatterT = z.infer<typeof ProjectFrontmatter>;

function sortProjects(a: ProjectFrontmatterT, b: ProjectFrontmatterT): number {
  if (a.year !== b.year) return b.year.localeCompare(a.year);
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  return ao - bo;
}

export function _loadProjectsFrom(dir: string): ProjectFrontmatterT[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const projects = files.map((f) => {
    const raw = readFileSync(join(dir, f), "utf-8");
    return ProjectFrontmatter.parse(matter(raw).data);
  });
  return projects.sort(sortProjects);
}

export function loadProjects(): ProjectFrontmatterT[] {
  return _loadProjectsFrom(join(process.cwd(), "content/projects"));
}
