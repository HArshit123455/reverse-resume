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
  kind: z.enum(["Side project", "OSS", "Bootstrapped", "Experiment", "Work"]),
  status: z.enum(["live", "archived"]),
  description: z.string().min(1).max(400),
  tags: z.array(z.string().min(1).max(40)).max(12),
  stats: z.array(ProjectStat).max(6).default([]),
  // absolute link to source, or a site path like "/chrysa" for an in-site story
  url: z
    .string()
    .regex(/^(https?:\/\/|\/)/, "url must be absolute or a site path")
    .optional(),
  /** small square image shown beside the title (an app icon) */
  icon: z.string().regex(/^\//).optional(),
  /** label for the link; defaults to "View source" */
  urlLabel: z.string().min(1).max(40).optional(),
  order: z.number().int().optional(),
  /** false keeps the entry (and anything built on it) but leaves it out of Selected work */
  selected: z.boolean().default(true),
});

export type ProjectFrontmatterT = z.infer<typeof ProjectFrontmatter>;

// Hand-set order is the editorial choice and wins; year (newest first) breaks ties.
function sortProjects(a: ProjectFrontmatterT, b: ProjectFrontmatterT): number {
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return b.year.localeCompare(a.year);
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

/** The projects shown under Selected work, in display order. */
export function loadSelectedProjects(): ProjectFrontmatterT[] {
  return loadProjects().filter((p) => p.selected);
}
