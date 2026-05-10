import { describe, it, expect } from "vitest";
import { chunkCode } from "./chunk-code";

const sampleTs = `
export function add(a: number, b: number): number {
  return a + b;
}

export class Calculator {
  multiply(a: number, b: number): number {
    return a * b;
  }
}

export const PI = 3.14159;
`;

describe("chunkCode", () => {
  it("extracts functions, classes, and exported consts as separate chunks for TypeScript", () => {
    const chunks = chunkCode(sampleTs, "src/calc.ts", "typescript");
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const symbols = chunks.map((c) => c.metadata.symbol).filter(Boolean);
    expect(symbols).toContain("add");
    expect(symbols).toContain("Calculator");
    expect(symbols).toContain("PI");
  });

  it("falls back to sliding window for unparseable language", () => {
    const longText = Array(200).fill("line").join("\n");
    const chunks = chunkCode(longText, "data/notes.txt", "unknown");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.chunkStrategy).toBe("sliding-window");
  });

  it("attaches filePath and language to every chunk", () => {
    const chunks = chunkCode(sampleTs, "src/calc.ts", "typescript");
    expect(chunks.every((c) => c.metadata.filePath === "src/calc.ts")).toBe(true);
    expect(chunks.every((c) => c.metadata.language === "typescript")).toBe(true);
  });
});
