import { describe, it, expect } from "vitest";
import { CitationStreamParser } from "./citation-parser";

describe("CitationStreamParser", () => {
  it("emits text deltas and detects citation tags", () => {
    const p = new CitationStreamParser([{ id: 1 }, { id: 2 }] as any);
    const events = [
      ...p.feed("I built a "),
      ...p.feed("rate limiter [1] using"),
      ...p.feed(" tree-sitter [2]."),
      ...p.flush(),
    ];

    const tokens = events.filter((e) => e.type === "token").map((e) => (e as any).text).join("");
    expect(tokens).toContain("rate limiter [1]");
    expect(tokens).toContain("tree-sitter [2]");

    const citations = events.filter((e) => e.type === "citation");
    expect(citations).toHaveLength(2);
    expect((citations[0] as any).chunk.id).toBe(1);
    expect((citations[1] as any).chunk.id).toBe(2);
  });

  it("ignores duplicate citations of the same number", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("[1] and again [1]"), ...p.flush()];
    expect(events.filter((e) => e.type === "citation")).toHaveLength(1);
  });

  it("drops out-of-range citations", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("hallucinated [9]"), ...p.flush()];
    expect(events.filter((e) => e.type === "citation")).toHaveLength(0);
  });

  it("handles citation tag split across chunks", () => {
    const p = new CitationStreamParser([{ id: 1 }] as any);
    const events = [...p.feed("text ["), ...p.feed("1] more"), ...p.flush()];
    const cits = events.filter((e) => e.type === "citation");
    expect(cits).toHaveLength(1);
  });
});
