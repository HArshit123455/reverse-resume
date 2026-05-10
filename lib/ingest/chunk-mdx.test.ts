import { describe, it, expect } from "vitest";
import { chunkMdx } from "./chunk-mdx";

const sample = `---
title: My Experience
role: Software Developer
themes: [backend, scaling]
---

# Intro

I do backend things.

## Outbox Pattern

Wrote an outbox table to decouple writes from publish.

\`\`\`ts
async function publish() { /* ... */ }
\`\`\`

## Partitioning

Range-partitioned the events table by month.
`;

describe("chunkMdx", () => {
  it("splits at h2 boundaries with shared front-matter", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((c) => c.metadata.title === "My Experience")).toBe(true);
    const titles = result.map((c) => c.metadata.heading).filter(Boolean);
    expect(titles).toContain("Outbox Pattern");
    expect(titles).toContain("Partitioning");
  });

  it("includes intro section before first h2", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    const intro = result.find((c) => c.metadata.heading === undefined || c.metadata.heading === "Intro");
    expect(intro).toBeDefined();
    expect(intro!.content).toContain("I do backend things");
  });

  it("attaches front-matter to every chunk's metadata", () => {
    const result = chunkMdx(sample, "experience/test.mdx");
    expect(result[0].metadata.role).toBe("Software Developer");
    expect(result[0].metadata.themes).toEqual(["backend", "scaling"]);
  });
});
