import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const SkillGroup = z.object({
  group: z.string().min(1).max(40),
  items: z.array(z.string().min(1).max(40)).min(1).max(20),
});

export const AboutLink = z.object({
  label: z.string().min(1).max(40),
  href: z
    .string()
    .min(1)
    .max(200)
    .regex(/^(https?:\/\/|mailto:)/, "href must start with http://, https://, or mailto:"),
});

export const Stat = z.object({
  num: z.string().min(1).max(8),
  unit: z.string().max(4).optional(),
  cap: z.string().min(1).max(60),
});

export const AboutFrontmatter = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  photo: z.string().min(1).max(200).optional(),
  resumeUrl: z.string().min(1).max(200).default("/resume.pdf"),
  location: z.string().min(1).max(80),
  availability: z.string().min(1).max(60).optional(),
  lede: z.string().min(1).max(400),
  support: z.string().min(1).max(500),
  stats: z.array(Stat).length(4),
  skills: z.array(SkillGroup).min(1).max(8),
  achievements: z.array(z.string().min(1).max(200)).max(10).default([]),
  links: z.array(AboutLink).min(1).max(8),
});

export type AboutFrontmatterT = z.infer<typeof AboutFrontmatter>;

export function loadAbout(): { data: AboutFrontmatterT; body: string } {
  const raw = readFileSync(join(process.cwd(), "content/about.mdx"), "utf-8");
  const parsed = matter(raw);
  return { data: AboutFrontmatter.parse(parsed.data), body: parsed.content };
}
