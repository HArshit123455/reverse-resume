import { anthropic, SONNET_MODEL, anthropicCostCents } from "@/lib/clients/anthropic";
import { recordSpend } from "@/lib/spend-cap/daily-cap";
import { CitationStreamParser, type StreamEvent } from "./citation-parser";
import type { RetrievedChunk } from "./retrieve";
import type { Audience } from "@/lib/sse";
import type { TestDb } from "@/tests/helpers/test-db";
import type { db as dbFn } from "@/lib/db/client";

type AnyDb = TestDb | ReturnType<typeof dbFn>;

// VOICE_INSTRUCTIONS — Phase 2 placeholders. Phase 5b (Content authoring)
// will polish the wording with the user. The shapes here are stable; the
// strings are what get tuned.
const VOICE_INSTRUCTIONS: Record<Audience, string> = {
  curious:
    "Audience: a curious reader exploring this portfolio. Use plain English. Avoid jargon when a normal word works. Lead with the story or the human problem, not the implementation. Short paragraphs. It's OK to be a little playful.",
  recruiter:
    "Audience: a technical recruiter or hiring manager. Lead with quantified outcomes, scope, and business impact in the first sentence. State the role and the team size where relevant. Keep code talk minimal — link to the artifact via [n] instead. Bias toward results over process.",
  engineer:
    "Audience: a senior engineer reviewing this work. Lead with the design decision and the tradeoff. Name specific files, modules, or functions when citing. Show code where it adds signal. Acknowledge what you'd do differently. Be concrete; skip the marketing layer.",
};

const SYSTEM_PROMPT = `You are the chat backend of Harshit Sindhu's "Reverse Resume" — a portfolio that proves engineering claims with real artifacts.

Style:
- First-person ("I built…", "I shipped…").
- Concise. 2–4 short paragraphs is usually right.
- Cite EVERY factual claim using [n] notation matching the numbered context below. If you can't cite, don't claim.
- Never fabricate file names, function names, or numbers.
- If the context doesn't answer the question, say so plainly and suggest what you DO have.

Format your answer in concise GitHub-flavored markdown:
- Bold key terms with **bold**.
- Use fenced code blocks (\`\`\`ts) for code samples of 3+ lines.
- Use inline \`code\` for short identifiers, file paths, or SQL fragments.
- Do not use H1/H2 headings; use **bold lead-ins** instead.
- Cite sources with [n] markers inline (you already do this — keep doing it).

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
  audience: Audience;
  signal?: AbortSignal;
}

export async function* generate(
  db: AnyDb,
  options: GenerateOptions
): AsyncGenerator<StreamEvent> {
  const { history, chunks, audience, signal } = options;
  const parser = new CitationStreamParser(chunks);

  // Prepend the audience voice block as its own (non-cached) system text.
  // SYSTEM_PROMPT stays the ephemeral-cached block so the cache stays warm
  // across audience switches.
  const stream = anthropic().beta.promptCaching.messages.stream(
    {
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: VOICE_INSTRUCTIONS[audience] },
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
