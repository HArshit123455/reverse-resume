import { describe, it, expect, afterEach, vi } from "vitest";
import { getGitlabCalendar } from "./gitlab";

describe("lib/gitlab getGitlabCalendar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a gitlab-sourced 53-week grid when the fetch succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ "2026-06-02": 7 }),
      }),
    );
    const cal = await getGitlabCalendar();
    expect(cal.source).toBe("gitlab");
    expect(cal.weeks).toHaveLength(53);
  });

  it("falls back to the committed snapshot on a non-200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    const cal = await getGitlabCalendar();
    expect(cal.source).toBe("snapshot");
    expect(cal.weeks).toHaveLength(53);
  });

  it("falls back to the committed snapshot when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const cal = await getGitlabCalendar();
    expect(cal.source).toBe("snapshot");
    expect(cal.weeks).toHaveLength(53);
  });

  it("falls back to the committed snapshot when the body is not an object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ["not", "an", "object"],
      }),
    );
    const cal = await getGitlabCalendar();
    expect(cal.source).toBe("snapshot");
    expect(cal.weeks).toHaveLength(53);
  });
});
