// lib/rag/tab.ts
//
// Three tab generators sharing one file. impact + story are LLM-backed and
// record spend; code is deterministic.
import { z } from "zod";
import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import type { RetrievedChunk } from "./retrieve";
import type { Audience } from "@/lib/sse";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

function renderChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const n = i + 1;
      const header = `[${n}] ${c.sourceType.toUpperCase()}${c.sourceProject ? ` — ${c.sourceProject}` : ""}${c.title ? ` — ${c.title}` : ""}${c.filePath ? ` — ${c.filePath}` : ""}`;
      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

// ──────────────────────────────────────────────────────────────────────────
//  Impact tab — JSON, Zod-validated, retries once
// ──────────────────────────────────────────────────────────────────────────
const ImpactItem = z.object({
  num: z.string().min(1).max(40),
  unit: z.string().max(40).default(""),
  label: z.string().min(1).max(160),
});
export const ImpactResult = z.object({
  items: z.array(ImpactItem).max(6),
});
export type ImpactResultT = z.infer<typeof ImpactResult>;

const IMPACT_SYSTEM = `You extract quantified outcomes from engineering context.

Return ONLY a JSON object matching:
{ "items": [ { "num": "<the number, e.g. '40%' or '12'>", "unit": "<short unit, e.g. 'ms' or 'rps' — empty string if the number already includes the unit>", "label": "<one short phrase, max 12 words, naming what the number measures>" } ] }

Rules:
- Maximum 4 items. Pick the most concrete and verifiable.
- If no quantified outcomes are present in the context, return { "items": [] }.
- Do NOT invent numbers. Every num must appear literally in the context.
- No prose, no markdown, no [n] citations — JSON only.`;

export interface GenerateImpactOptions {
  question: string;
  audience: Audience;
  chunks: RetrievedChunk[];
  signal?: AbortSignal;
}

async function callImpactOnce(db: AnyDb, opts: GenerateImpactOptions): Promise<ImpactResultT> {
  const client = anthropic();
  const res = await client.messages.create(
    {
      model: SONNET_MODEL,
      max_tokens: 600,
      system: IMPACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Question: ${opts.question}\n\nContext:\n${renderChunksAsContext(opts.chunks)}\n\nReturn the JSON now.`,
        },
      ],
    },
    { signal: opts.signal }
  );
  const text = res.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(cleaned);
  const validated = ImpactResult.parse(parsed);

  const cost = anthropicCostCents(SONNET_MODEL, {
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
  });
  await recordSpend(db, cost);
  return validated;
}

export async function generateImpact(
  db: AnyDb,
  opts: GenerateImpactOptions
): Promise<ImpactResultT> {
  try {
    return await callImpactOnce(db, opts);
  } catch (firstErr) {
    try {
      return await callImpactOnce(db, opts);
    } catch (secondErr) {
      console.error("[tab/impact] both attempts failed", { firstErr, secondErr });
      return { items: [] };
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Code tab — deterministic, no LLM
// ──────────────────────────────────────────────────────────────────────────
export interface CodeChunkResult {
  file: string | null;
  language: string;
  code: string;
  sourceProject: string | null;
  sourceUrl: string | null;
}

export function pickCodeChunk(chunks: RetrievedChunk[]): CodeChunkResult | null {
  for (const c of chunks) {
    const lang = (c.metadata?.language as string | undefined) ?? "";
    if (c.sourceType === "github" || lang) {
      return {
        file: c.filePath,
        language: lang || inferLanguage(c.filePath) || "text",
        code: c.content,
        sourceProject: c.sourceProject,
        sourceUrl: c.sourceUrl,
      };
    }
  }
  return null;
}

function inferLanguage(filePath: string | null): string | null {
  if (!filePath) return null;
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  const map: Record<string, string> = {
    ts: "ts", tsx: "tsx", js: "js", jsx: "jsx",
    py: "python", rs: "rust", go: "go", java: "java",
    sql: "sql", sh: "bash", md: "md", mdx: "mdx",
    yaml: "yaml", yml: "yaml", json: "json",
  };
  return map[ext] ?? null;
}

// ──────────────────────────────────────────────────────────────────────────
//  Story tab — streamed narrative
// ──────────────────────────────────────────────────────────────────────────
const STORY_SYSTEM = `You retell engineering work as narrative.

Style:
- First-person ("I noticed…", "I tried…").
- Lead with the moment of friction — the bug, the constraint, the user complaint, the surprise.
- 3–5 short paragraphs. Concrete.
- Mark factual claims with [n] citations matching the numbered context.
- No marketing voice. No "I'm passionate about". Just the work.`;

export interface GenerateStoryOptions {
  question: string;
  audience: Audience;
  chunks: RetrievedChunk[];
  signal?: AbortSignal;
}

export interface StoryEvent {
  type: "token" | "done" | "error";
  text?: string;
  message?: string;
}

export async function* generateStory(
  db: AnyDb,
  opts: GenerateStoryOptions
): AsyncGenerator<StoryEvent> {
  try {
    const stream = anthropic().messages.stream(
      {
        model: SONNET_MODEL,
        max_tokens: 800,
        system: STORY_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Question: ${opts.question}\n\nContext:\n${renderChunksAsContext(opts.chunks)}\n\nTell the story.`,
          },
        ],
      },
      { signal: opts.signal }
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "token", text: event.delta.text };
      }
    }
    const finalMessage = await stream.finalMessage();
    const cost = anthropicCostCents(SONNET_MODEL, {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    });
    await recordSpend(db, cost);
    yield { type: "done" };
  } catch (e) {
    console.error("[tab/story] failed", e);
    yield { type: "error", message: "Couldn't generate the story right now." };
    yield { type: "done" };
  }
}
