import { describe, it, expect } from "vitest";
import { AboutFrontmatter } from "@/lib/content/about";

const valid = {
  name: "Harshit Sindhu",
  tagline: "Backend-heavy full-stack developer",
  location: "New Delhi, India",
  availability: "Open to opportunities",
  lede: "I own the *backend half* of B2B platforms.",
  support: "At Zykrr I work across an analytics platform.",
  stats: [
    { num: "~2", unit: "yrs", cap: "building B2B platforms in production" },
    { num: "100+", cap: "REST APIs designed & shipped" },
    { num: "400+", cap: "DSA problems solved" },
    { num: "5", unit: "★", cap: "Problem Solving on HackerRank" },
  ],
  skills: [{ group: "Languages", items: ["TypeScript"] }],
  links: [{ label: "GitHub", href: "https://github.com/x" }],
};

describe("AboutFrontmatter", () => {
  it("parses a complete record", () => {
    const parsed = AboutFrontmatter.parse(valid);
    expect(parsed.location).toBe("New Delhi, India");
    expect(parsed.stats).toHaveLength(4);
    expect(parsed.lede).toContain("*backend half*");
  });

  it("requires exactly 4 stats", () => {
    expect(() => AboutFrontmatter.parse({ ...valid, stats: valid.stats.slice(0, 3) })).toThrow();
  });

  it("requires location and lede", () => {
    const { location: _l, ...noLoc } = valid;
    expect(() => AboutFrontmatter.parse(noLoc)).toThrow();
    const { lede: _le, ...noLede } = valid;
    expect(() => AboutFrontmatter.parse(noLede)).toThrow();
  });
});
