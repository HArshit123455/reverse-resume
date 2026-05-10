import { describe, it, expect, vi, beforeEach } from "vitest";
import { embed, rerank, voyageCostCents } from "./voyage";

describe("voyage client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.VOYAGE_API_KEY = "test-key";
  });

  it("embed() posts inputs and returns embeddings", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [{ embedding: Array(1024).fill(0.1), index: 0 }],
          model: "voyage-3",
          usage: { total_tokens: 5 },
        }),
        { status: 200 }
      )
    );

    const result = await embed(["hello world"], "voyage-3");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.voyageai.com/v1/embeddings",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toHaveLength(1024);
    expect(result.totalTokens).toBe(5);
  });

  it("rerank() returns sorted indices with scores", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [
            { index: 2, relevance_score: 0.9 },
            { index: 0, relevance_score: 0.7 },
            { index: 1, relevance_score: 0.4 },
          ],
          model: "rerank-2",
          usage: { total_tokens: 10 },
        }),
        { status: 200 }
      )
    );

    const result = await rerank("query", ["a", "b", "c"], 3);
    expect(result.results[0].index).toBe(2);
    expect(result.results[0].relevanceScore).toBeCloseTo(0.9);
  });

  it("voyageCostCents charges voyage-code-3 at its higher rate, not voyage-3", () => {
    // 1M tokens at voyage-3 = $0.06 = ₹5.04 = 504 paise; at voyage-code-3 = $0.18 = ₹15.12 = 1512 paise.
    const cheap = voyageCostCents(1_000_000, "voyage-3");
    const code = voyageCostCents(1_000_000, "voyage-code-3");
    expect(code).toBeGreaterThan(cheap);
    expect(code).toBe(Math.ceil(0.18 * 84 * 100));
    expect(cheap).toBe(Math.ceil(0.06 * 84 * 100));
  });
});
