import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _loadNowFrom, NowFrontmatter } from "./now";

describe("lib/content/now", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "rr-now-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeNow(frontmatter: string) {
    writeFileSync(join(dir, "now.mdx"), `---\n${frontmatter}\n---\n`);
  }

  it("parses a valid 4-item Now file", () => {
    writeNow(
      `updated: "2026-05-20"
items:
  - { kind: "Building",  title: "Reverse Resume",   desc: "RAG over my work history." }
  - { kind: "Reading",   title: "DDIA",             desc: "Re-read." }
  - { kind: "Learning",  title: "Rust ownership",   desc: "Small TUI." }
  - { kind: "Listening", title: "Signals & Threads", desc: "Jane Street podcast." }`
    );
    const now = _loadNowFrom(dir);
    expect(now.updated).toBe("2026-05-20");
    expect(now.items).toHaveLength(4);
    expect(now.items[0].kind).toBe("Building");
  });

  it("rejects unknown kinds", () => {
    writeNow(`updated: "2026-05-20"
items:
  - { kind: "Vibing", title: "x", desc: "y" }`);
    expect(() => _loadNowFrom(dir)).toThrow();
  });

  it("requires at least one item", () => {
    writeNow(`updated: "2026-05-20"
items: []`);
    expect(() => _loadNowFrom(dir)).toThrow();
  });

  it("validates NowFrontmatter zod schema directly", () => {
    const result = NowFrontmatter.safeParse({
      updated: "2026-05-20",
      items: [{ kind: "Building", title: "T", desc: "D" }],
    });
    expect(result.success).toBe(true);
  });
});
