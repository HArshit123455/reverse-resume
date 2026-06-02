import { describe, it, expect } from "vitest";
import { loadAbout, AboutFrontmatter } from "./about";

describe("lib/content/about", () => {
  it("loads about.mdx with frontmatter and a prose body", () => {
    const about = loadAbout();
    expect(about.data.name.length).toBeGreaterThan(0);
    expect(about.data.skills.length).toBeGreaterThan(0);
    expect(about.data.links.length).toBeGreaterThan(0);
    expect(about.body.trim().length).toBeGreaterThan(0);
  });

  it("validates the zod schema (photo optional)", () => {
    const r = AboutFrontmatter.safeParse({
      name: "X", tagline: "t", resumeUrl: "/resume.pdf",
      skills: [{ group: "Backend", items: ["Node.js"] }],
      achievements: ["a"],
      links: [{ label: "GitHub", href: "https://github.com/x" }],
    });
    expect(r.success).toBe(true);
  });
});
