import { describe, it, expect } from "vitest";
import { chaptersOf, readingMinutes, slugify, loadChrysa } from "./chrysa";

describe("chrysa content", () => {
  it("slugifies headings with curly quotes and punctuation", () => {
    expect(slugify("What broke, and what it taught me")).toBe("what-broke-and-what-it-taught-me");
    expect(slugify("What I’d tell myself on day one")).toBe("what-id-tell-myself-on-day-one");
  });

  it("reads chapters from level-two headings only", () => {
    const body = "## One\ntext\n### Sub\n## Two\n";
    expect(chaptersOf(body)).toEqual([
      { id: "one", title: "One" },
      { id: "two", title: "Two" },
    ]);
  });

  it("rounds reading time up and never returns zero", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes(Array(231).fill("w").join(" "))).toBe(2);
  });

  it("loads and validates the real Chrysa story", () => {
    const { data, chapters, minutes } = loadChrysa();
    expect(data.title).toBe("Chrysa");
    expect(chapters.length).toBeGreaterThanOrEqual(6);
    expect(minutes).toBeGreaterThan(5);
  });

  it("never links the private Chrysa repo", () => {
    const { data, body } = loadChrysa();
    const all = JSON.stringify(data) + body;
    expect(all).not.toMatch(/github\.com\/HArshit123455\/chrysa(?!-site)/);
    expect(all).not.toMatch(/expo\.dev\/artifacts|qr\.expo\.dev/);
  });
});
