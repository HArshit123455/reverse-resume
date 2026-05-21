// app/api/chat/tab/route.ts
import { z } from "zod";
import { db } from "@/lib/db/client";
import { hashIp, todayIstDateStr } from "@/lib/rate-limit/ip-hash";
import { consume } from "@/lib/rate-limit/postgres-token-bucket";
import { checkCap } from "@/lib/spend-cap/daily-cap";
import { getChunks } from "@/lib/rag/cache";
import { retrieveByIds } from "@/lib/rag/retrieve";
import { generateImpact, generateStory, pickCodeChunk } from "@/lib/rag/tab";
import { encodeSse } from "@/lib/sse";

export const runtime = "nodejs";

const Body = z.object({
  messageId: z.string().min(1).max(80),
  audience: z.enum(["curious", "recruiter", "engineer"]),
  tab: z.enum(["impact", "code", "story"]),
});

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "0.0.0.0";
}

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json());
  if (!body.success) {
    return new Response(JSON.stringify({ error: "invalid body" }), { status: 400 });
  }

  const database = db();
  const ipHash = hashIp(clientIp(req), `${process.env.DAILY_SALT}:${todayIstDateStr()}`);
  const capCents = Number(process.env.DAILY_CAP_CENTS ?? "20000");
  const maxTokens = Number(process.env.RATE_LIMIT_MAX ?? "10");
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? "3600");
  const refillPerSecond = maxTokens / windowSec;

  const rl = await consume(database, ipHash, { maxTokens, refillPerSecond });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds ?? 60 }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const cap = await checkCap(database, capCents);
  if (!cap.ok) {
    return new Response(
      JSON.stringify({ error: "spend_capped", message: "Daily budget hit." }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  const entry = getChunks(body.data.messageId);
  if (!entry) {
    return new Response(
      JSON.stringify({ error: "cache_miss", message: "Original answer expired — ask the question again." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const numericIds = entry.chunkIds.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  const chunks = await retrieveByIds(database, numericIds);

  if (body.data.tab === "code") {
    const picked = pickCodeChunk(chunks);
    return new Response(JSON.stringify({ chunk: picked }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.data.tab === "impact") {
    try {
      const result = await generateImpact(database, {
        question: entry.question,
        audience: body.data.audience,
        chunks,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("[tab/impact route]", e);
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Story tab — SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of generateStory(database, {
          question: entry.question,
          audience: body.data.audience,
          chunks,
        })) {
          if (ev.type === "token") {
            controller.enqueue(encodeSse({ type: "token", text: ev.text ?? "" }));
          } else if (ev.type === "error") {
            controller.enqueue(encodeSse({ type: "error", message: ev.message ?? "error" }));
          } else if (ev.type === "done") {
            controller.enqueue(encodeSse({ type: "done" }));
          }
        }
      } catch (e) {
        console.error("[tab/story route]", e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Story generation failed." })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
