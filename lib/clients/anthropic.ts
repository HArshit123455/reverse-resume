import Anthropic from "@anthropic-ai/sdk";

export const SONNET_MODEL = "claude-sonnet-4-6";
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is required");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Pricing (USD per 1M tokens, verify against console.anthropic.com)
const PRICING = {
  [SONNET_MODEL]: {
    inputPer1M: 3.0,
    cachedInputPer1M: 0.3, // 90% discount on cache hits
    outputPer1M: 15.0,
    cacheWritePer1M: 3.75, // 25% premium on cache writes
  },
  [HAIKU_MODEL]: {
    inputPer1M: 0.8,
    cachedInputPer1M: 0.08,
    outputPer1M: 4.0,
    cacheWritePer1M: 1.0,
  },
} as const;
const USD_TO_INR = 84;

export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export function anthropicCostCents(model: keyof typeof PRICING, usage: UsageBreakdown): number {
  const p = PRICING[model];
  const cached = usage.cacheReadInputTokens ?? 0;
  const cacheWrite = usage.cacheCreationInputTokens ?? 0;

  // Anthropic's `input_tokens` already excludes cache reads and cache writes —
  // they're sibling counts, not subsets. Sum additively.
  const usd =
    (usage.inputTokens / 1_000_000) * p.inputPer1M +
    (cached / 1_000_000) * p.cachedInputPer1M +
    (cacheWrite / 1_000_000) * p.cacheWritePer1M +
    (usage.outputTokens / 1_000_000) * p.outputPer1M;

  return Math.ceil(usd * USD_TO_INR * 100);
}
