import { describe, it, expect } from "vitest";
import { GRAPH } from "./graph-data";

describe("lib/graph-data", () => {
  it("has unique node ids", () => {
    const ids = GRAPH.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every edge references existing nodes", () => {
    const ids = new Set(GRAPH.nodes.map((n) => n.id));
    for (const e of GRAPH.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it("the self node connects to every repo node", () => {
    const repos = GRAPH.nodes.filter((n) => n.group === "repo").map((n) => n.id);
    const fromMe = GRAPH.edges.filter((e) => e.from === "me").map((e) => e.to);
    for (const r of repos) expect(fromMe).toContain(r);
  });
});
