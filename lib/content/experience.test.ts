import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadExperienceFrom, ExperienceFrontmatter, isCurrent } from "@/lib/content/experience";

describe("ExperienceFrontmatter", () => {
  const base = { title: "T", role: "R", employer: "E", dates: "2024 to present" };

  it("accepts the new display fields", () => {
    const parsed = ExperienceFrontmatter.parse({
      ...base,
      kind: "Full-time",
      summary: "Did things.",
      logo: "/logos/zykrr.svg",
      stack: ["TypeScript"],
    });
    expect(parsed.kind).toBe("Full-time");
    expect(parsed.summary).toBe("Did things.");
    expect(parsed.logo).toBe("/logos/zykrr.svg");
  });

  it("rejects an invalid kind", () => {
    expect(() => ExperienceFrontmatter.parse({ ...base, kind: "Contractor" })).toThrow();
  });

  it("leaves the new fields optional", () => {
    expect(() => ExperienceFrontmatter.parse(base)).not.toThrow();
  });
});

describe("isCurrent", () => {
  it("is true when dates mention present (any case)", () => {
    expect(isCurrent("2024 to present")).toBe(true);
    expect(isCurrent("2024 — Present")).toBe(true);
  });
  it("is false for finished ranges", () => {
    expect(isCurrent("2020-2024")).toBe(false);
    expect(isCurrent(undefined)).toBe(false);
  });
});

describe("lib/content/experience (_loadExperienceFrom)", () => {
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

  it("breaks same-year ties by order ascending", () => {
    write("b.mdx", `title: "B"\nrole: "Dev"\nemployer: "B Co"\ndates: "2024"\nlocation: "X"\nstack: []\norder: 2`);
    write("a.mdx", `title: "A"\nrole: "Dev"\nemployer: "A Co"\ndates: "2024"\nlocation: "X"\nstack: []\norder: 1`);
    const exp = _loadExperienceFrom(dir);
    expect(exp.map((e) => e.employer)).toEqual(["A Co", "B Co"]);
  });
});
