import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chrysaMarkdownForIngest, CHRYSA_FILE } from "./source-chrysa";
import { docsFromMarkdown } from "./source-mdx";

const raw = readFileSync(join(process.cwd(), CHRYSA_FILE), "utf-8");

describe("chrysa ingest", () => {
  it("adds the at-a-glance facts and the timeline, which live in frontmatter", () => {
    const md = chrysaMarkdownForIngest(raw);
    expect(md).toContain("## Chrysa at a glance");
    expect(md).toContain("**First commit to 1.0.0:** 15 days");
    expect(md).toContain("## Chrysa timeline, day by day");
    expect(md).toContain("**6 Sep 2026:**");
  });

  it("chunks one section per heading, all tagged to the chrysa project", () => {
    const docs = docsFromMarkdown(chrysaMarkdownForIngest(raw), CHRYSA_FILE, "experience");
    expect(docs.length).toBeGreaterThanOrEqual(10);
    expect(new Set(docs.map((d) => d.sourceProject))).toEqual(new Set(["chrysa"]));
    expect(docs.every((d) => d.sourceType === "experience")).toBe(true);
    expect(new Set(docs.map((d) => d.contentHash)).size).toBe(docs.length);
  });

  it("never carries the private repo or Expo build links into the index", () => {
    const md = chrysaMarkdownForIngest(raw);
    expect(md).not.toMatch(/github\.com\/HArshit123455\/chrysa(?!-site)/);
    expect(md).not.toMatch(/expo\.dev\/artifacts|qr\.expo\.dev/);
  });
});
