const BASE = "https://api.voyageai.com/v1";

export type VoyageEmbedModel = "voyage-3" | "voyage-code-3";

export interface EmbedResult {
  embeddings: number[][];
  totalTokens: number;
}

export interface RerankItem {
  index: number;
  relevanceScore: number;
}

export interface RerankResult {
  results: RerankItem[];
  totalTokens: number;
}

function authHeaders(): Record<string, string> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is required");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function embed(
  inputs: string[],
  model: VoyageEmbedModel = "voyage-3"
): Promise<EmbedResult> {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ input: inputs, model }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage embed failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
    usage: { total_tokens: number };
  };
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return {
    embeddings: sorted.map((d) => d.embedding),
    totalTokens: json.usage.total_tokens,
  };
}

export async function rerank(
  query: string,
  documents: string[],
  topK: number,
  model = "rerank-2"
): Promise<RerankResult> {
  const res = await fetch(`${BASE}/rerank`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, documents, model, top_k: topK, return_documents: false }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage rerank failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    data: Array<{ index: number; relevance_score: number }>;
    usage: { total_tokens: number };
  };
  return {
    results: json.data.map((d) => ({ index: d.index, relevanceScore: d.relevance_score })),
    totalTokens: json.usage.total_tokens,
  };
}

const VOYAGE_3_USD_PER_1M = 0.06;
const RERANK_2_USD_PER_1M = 0.05;
const USD_TO_INR = 84;

export function voyageCostCents(tokens: number, kind: "embed" | "rerank"): number {
  const usdPer1M = kind === "embed" ? VOYAGE_3_USD_PER_1M : RERANK_2_USD_PER_1M;
  const inrCost = (tokens / 1_000_000) * usdPer1M * USD_TO_INR;
  return Math.ceil(inrCost * 100);
}
