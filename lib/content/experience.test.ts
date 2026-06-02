import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadExperienceFrom, ExperienceFrontmatter } from "./experience";

describe("lib/content/experience", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "rr-exp-")); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  function write(name: string, fm: string) {
    writeFileSync(join(dir, name), `---\n${fm}\n---\nbody\n`);
  }

  it("includes employed roles, sorted by start year descending", () => {
    write("zykrr.mdx", `title: "Z"\nrole: "Software Developer"\nemployer: "Zykrr"\ndates: "2024 to present"\nlocation: "Delhi"\nstack: ["TypeScript"]`);
    write("eil.mdx", `title: "E"\nrole: "Intern"\nemployer: "Engineers India Limited"\ndates: "2022"\nlocation: "Delhi"\nstack: []`);
    write("dtu.mdx", `title: "D"\nrole: "B.Tech"\nemployer: "Delhi Technological University"\ndates: "2020-2024"\nlocation: "Delhi"\nstack: []`);
    const exp = _loadExperienceFrom(dir);
    expect(exp.map((e) => e.employer)).toEqual([
      "Zykrr",
      "Engineers India Limited",
      "Delhi Technological University",
    ]);
  });

  it("excludes Personal entries (position papers, side projects)", () => {
    write("zykrr.mdx", `title: "Z"\nrole: "Dev"\nemployer: "Zykrr"\ndates: "2024 to present"\nlocation: "Delhi"\nstack: []`);
    write("philosophy.mdx", `title: "P"\nrole: "Position paper"\nemployer: "Personal"\nstack: []`);
    write("proshop.mdx", `title: "PS"\nrole: "Personal Project"\nemployer: "Personal"\ndates: "2023"\nlocation: "Remote"\nstack: ["React"]`);
    const exp = _loadExperienceFrom(dir);
    expect(exp.map((e) => e.employer)).toEqual(["Zykrr"]);
  });

  it("excludes employed entries that are missing dates (cannot place on a timeline)", () => {
    write("nodate.mdx", `title: "N"\nrole: "Dev"\nemployer: "SomeCo"\nlocation: "Delhi"\nstack: []`);
    expect(_loadExperienceFrom(dir)).toHaveLength(0);
  });

  it("validates the zod schema directly", () => {
    const r = ExperienceFrontmatter.safeParse({
      title: "T", role: "Dev", employer: "Zykrr", dates: "2024", location: "Delhi", stack: ["TS"],
    });
    expect(r.success).toBe(true);
  });
});
