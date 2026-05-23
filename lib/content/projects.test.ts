import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadProjectsFrom, ProjectFrontmatter } from "./projects";

describe("lib/content/projects", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "rr-projects-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, frontmatter: string, body = "") {
    writeFileSync(join(dir, name), `---\n${frontmatter}\n---\n${body}\n`);
  }

  it("parses a valid entry", () => {
    write(
      "rr.mdx",
      `title: "Reverse Resume"
slug: "reverse-resume"
year: "2026"
kind: "Side project"
status: "live"
description: "RAG over my own work history."
tags: ["TypeScript", "Next.js"]
stats:
  - { label: "Repos indexed", val: "4" }
url: "https://example.com"
order: 1`
    );
    const projects = _loadProjectsFrom(dir);
    expect(projects).toHaveLength(1);
    expect(projects[0].slug).toBe("reverse-resume");
    expect(projects[0].kind).toBe("Side project");
    expect(projects[0].stats[0]).toEqual({ label: "Repos indexed", val: "4" });
  });

  it("sorts by year desc, then order asc", () => {
    write("a.mdx", `title: "A"\nslug: "a"\nyear: "2024"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 2`);
    write("b.mdx", `title: "B"\nslug: "b"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 2`);
    write("c.mdx", `title: "C"\nslug: "c"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 1`);
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["c", "b", "a"]);
  });

  it("defaults order to MAX_SAFE_INTEGER so unordered entries land last within a year", () => {
    write("a.mdx", `title: "A"\nslug: "a"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    write("b.mdx", `title: "B"\nslug: "b"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []\norder: 1`);
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["b", "a"]);
  });

  it("throws on invalid kind", () => {
    write("bad.mdx", `title: "X"\nslug: "x"\nyear: "2026"\nkind: "Hot Garbage"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    expect(() => _loadProjectsFrom(dir)).toThrow();
  });

  it("validates ProjectFrontmatter zod schema directly", () => {
    const result = ProjectFrontmatter.safeParse({
      title: "T", slug: "t", year: "2026", kind: "OSS", status: "archived",
      description: "d", tags: ["a"], stats: [], url: "https://x.com", order: 1,
    });
    expect(result.success).toBe(true);
  });

  it("skips non-MDX files in the directory", () => {
    write("ok.mdx", `title: "OK"\nslug: "ok"\nyear: "2026"\nkind: "Side project"\nstatus: "live"\ndescription: "."\ntags: []\nstats: []`);
    writeFileSync(join(dir, "README.md"), "# nope");
    writeFileSync(join(dir, ".DS_Store"), "junk");
    const projects = _loadProjectsFrom(dir);
    expect(projects.map((p) => p.slug)).toEqual(["ok"]);
  });
});
