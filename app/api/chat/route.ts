// app/api/chat/route.ts
import { z } from "zod";
import { db } from "@/lib/db/client";
import { hashIp, todayIstDateStr } from "@/lib/rate-limit/ip-hash";
import { consume } from "@/lib/rate-limit/postgres-token-bucket";
import { checkCap } from "@/lib/spend-cap/daily-cap";
import { rewriteQuery } from "@/lib/rag/rewrite";
import { retrieve } from "@/lib/rag/retrieve";
import { generate } from "@/lib/rag/generate";
import { makeSseStream } from "@/lib/sse";

export const runtime = "nodejs";

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1),
  audience: z.enum(["curious", "recruiter", "engineer"]).default("curious"),
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

  const { stream, send, close } = makeSseStream();

  // Run pipeline asynchronously so we can return the stream immediately
  (async () => {
    try {
      // 1. Rate limit
      const rl = await consume(database, ipHash, { maxTokens, refillPerSecond });
      if (!rl.allowed) {
        send({ type: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds ?? 60 });
        send({ type: "done" });
        close();
        return;
      }

      // 2. Spend cap (entry check)
      const cap = await checkCap(database, capCents);
      if (!cap.ok) {
        send({
          type: "spend_capped",
          message:
            "I've hit my daily budget. Try again at IST midnight, or email Harshit at harshitsindhu10@gmail.com.",
        });
        send({ type: "done" });
        close();
        return;
      }

      // 3. Rewrite, retrieve, generate
      const rewritten = await rewriteQuery(database, body.data.messages);
      const chunks = await retrieve(database, rewritten, { topK: 5 });

      // 3a. Announce the message-id + retrieved chunk ids so the client can
      //     later request follow-up tabs (Phase 3) against the same chunks.
      const messageId = crypto.randomUUID();
      send({
        type: "init",
        messageId,
        chunkIds: chunks.map((c) => String(c.id)),
      });

      // 4. Re-check cap before expensive Sonnet call
      const cap2 = await checkCap(database, capCents);
      if (!cap2.ok) {
        send({ type: "spend_capped", message: "Daily budget hit during request — try again later." });
        send({ type: "done" });
        close();
        return;
      }

      const abortController = new AbortController();
      req.signal.addEventListener("abort", () => abortController.abort(), { once: true });

      for await (const event of generate(database, {
        history: body.data.messages,
        chunks,
        audience: body.data.audience,
        signal: abortController.signal,
      })) {
        send(event);
      }
      send({ type: "done" });
      close();
    } catch (e) {
      send({ type: "error", message: "I'm having trouble responding right now — please try again in a minute." });
      send({ type: "done" });
      close();
      console.error("[chat]", e);
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
