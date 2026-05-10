import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import { CitationStreamParser, type StreamEvent } from "./citation-parser";
import type { RetrievedChunk } from "./retrieve";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

const SYSTEM_PROMPT = `You are the chat backend of Harshit Sindhu's "Reverse Resume" — a portfolio that proves engineering claims with real artifacts.

Style:
- First-person ("I built…", "I shipped…").
- Concise. 2–4 short paragraphs is usually right.
- Cite EVERY factual claim using [n] notation matching the numbered context below. If you can't cite, don't claim.
- Never fabricate file names, function names, or numbers.
- If the context doesn't answer the question, say so plainly and suggest what you DO have.

Audience: technical recruiters and hiring managers. They want truth they can verify, not marketing.`;

function renderChunksAsContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const n = i + 1;
      const header = `[${n}] ${c.sourceType.toUpperCase()}${c.sourceProject ? ` — ${c.sourceProject}` : ""}${c.title ? ` — ${c.title}` : ""}${c.filePath ? ` — ${c.filePath}` : ""}`;
      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

export interface GenerateOptions {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  chunks: RetrievedChunk[];
  signal?: AbortSignal;
}

export async function* generate(
  db: AnyDb,
  options: GenerateOptions
): AsyncGenerator<StreamEvent> {
  const { history, chunks, signal } = options;
  const parser = new CitationStreamParser(chunks);

  // Use beta.promptCaching.messages.stream for cache_control support on system blocks.
  // Core.RequestOptions includes `signal` for abort handling.
  const stream = anthropic().beta.promptCaching.messages.stream(
    {
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: renderChunksAsContext(chunks) },
      ],
      messages: history.map((t) => ({ role: t.role, content: t.content })),
    },
    { signal }
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      for (const ev of parser.feed(event.delta.text)) {
        yield ev;
      }
    }
  }
  for (const ev of parser.flush()) yield ev;

  // Record spend after stream completes.
  // PromptCachingBetaUsage has cache_read_input_tokens and cache_creation_input_tokens (nullable).
  // If the stream throws mid-iteration, finalMessage() never runs and no spend is
  // recorded — partial generations are not billed. This is intentional.
  const finalMessage = await stream.finalMessage();
  const cost = anthropicCostCents(SONNET_MODEL, {
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    cacheReadInputTokens: finalMessage.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
  });
  await recordSpend(db, cost);
}
