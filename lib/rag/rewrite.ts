// lib/rag/rewrite.ts
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, HAIKU_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

export interface ChatTurn { role: "user" | "assistant"; content: string }

const REWRITE_SYSTEM = `You expand a recruiter's latest question into a concise standalone search query suitable for vector retrieval over a software engineer's portfolio (code, snippets, professional experience entries).

Rules:
- Output ONLY the rewritten query, nothing else.
- Pull in entity names from the conversation history if they disambiguate.
- Keep under 30 words.
- Do not invent facts.`;

export async function rewriteQuery(db: AnyDb, history: ChatTurn[]): Promise<string> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") return "";

  const trimmed = last.content.trim();

  // Short-circuit: if there's no prior context, don't even call the LLM.
  if (history.length === 1 && trimmed.length < 80) return trimmed;

  const res = await anthropic().messages.create({
    model: HAIKU_MODEL,
    max_tokens: 100,
    system: REWRITE_SYSTEM,
    messages: history.map((t) => ({ role: t.role, content: t.content })),
  });

  const cost = anthropicCostCents(HAIKU_MODEL, {
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  });
  await recordSpend(db, cost);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return text || trimmed;
}
