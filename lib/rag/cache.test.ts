import { describe, it, expect, beforeEach } from "vitest";
import { cacheChunks, getChunks, _resetForTests } from "./cache";

describe("rag/cache", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("returns undefined on miss", () => {
    expect(getChunks("not-a-message-id")).toBeUndefined();
  });

  it("round-trips an entry", () => {
    cacheChunks("m1", { chunkIds: ["10", "20"], question: "what?", audience: "curious" });
    const e = getChunks("m1");
    expect(e?.chunkIds).toEqual(["10", "20"]);
    expect(e?.question).toBe("what?");
    expect(e?.audience).toBe("curious");
    expect(typeof e?.storedAt).toBe("number");
  });

  it("preserves the most recent entry for a given key", () => {
    cacheChunks("m1", { chunkIds: ["1"], question: "first", audience: "curious" });
    cacheChunks("m1", { chunkIds: ["2"], question: "second", audience: "engineer" });
    const e = getChunks("m1");
    expect(e?.chunkIds).toEqual(["2"]);
    expect(e?.question).toBe("second");
    expect(e?.audience).toBe("engineer");
  });

  it("evicts the oldest entry when max=200 is exceeded", () => {
    for (let i = 0; i < 200; i++) {
      cacheChunks(`m${i}`, { chunkIds: [`${i}`], question: "q", audience: "curious" });
    }
    // Do not getChunks(m0) here — get() promotes the entry to MRU and skews
    // the eviction order. Insert one past the cap and confirm m0 (the
    // least-recently-used) got dropped.
    cacheChunks("m200", { chunkIds: ["200"], question: "q", audience: "curious" });
    expect(getChunks("m0")).toBeUndefined();
    expect(getChunks("m200")).toBeDefined();
    expect(getChunks("m199")).toBeDefined();
  });
});
