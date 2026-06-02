import { describe, it, expect } from "vitest";
import { buildGrid, lookupFromRaw, totalCommits, deterministicSeed } from "./gitlab-calendar";

const TODAY = new Date(Date.UTC(2026, 5, 2)); // 2026-06-02

describe("lib/gitlab-calendar", () => {
  it("buildGrid yields 53 weeks of 7 days", () => {
    const weeks = buildGrid(TODAY, {});
    expect(weeks).toHaveLength(53);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("buildGrid maps counts and levels from the lookup", () => {
    const weeks = buildGrid(TODAY, { "2026-06-02": 10 });
    const last = weeks[52][6];
    expect(last.date).toBe("2026-06-02");
    expect(last.count).toBe(10);
    expect(last.level).toBe(3); // 8..15 => level 3
  });

  it("lookupFromRaw coerces numeric strings and rejects non-objects", () => {
    expect(lookupFromRaw({ "2026-06-01": "4", "2026-06-02": 2 })).toEqual({
      "2026-06-01": 4,
      "2026-06-02": 2,
    });
    expect(lookupFromRaw(null)).toBeNull();
    expect(lookupFromRaw("nope")).toBeNull();
    expect(lookupFromRaw([])).toBeNull();
  });

  it("totalCommits sums every cell", () => {
    const weeks = buildGrid(TODAY, { "2026-06-02": 10, "2026-06-01": 5 });
    expect(totalCommits(weeks)).toBe(15);
  });

  it("deterministicSeed is stable and non-trivial for a given date", () => {
    const seed = deterministicSeed(TODAY);
    expect(seed).toEqual(deterministicSeed(TODAY));
    expect(Object.keys(seed).length).toBeGreaterThan(50);
    expect(Object.values(seed).every((v) => v > 0)).toBe(true);
  });
});
