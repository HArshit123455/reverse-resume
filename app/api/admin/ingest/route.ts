import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { ingestRepo } from "@/lib/ingest/source-github";
import { ingestMdxDir } from "@/lib/ingest/source-mdx";
import { join } from "node:path";

const Body = z.discriminatedUnion("source", [
  z.object({ source: z.literal("github"), owner: z.string(), repo: z.string() }),
  z.object({ source: z.literal("experience") }),
  z.object({ source: z.literal("snippets") }),
]);

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization");
  const expected = process.env.INGEST_TOKEN;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const body = parsed.data;
  const database = db();

  try {
    if (body.source === "github") {
      const result = await ingestRepo(database, body.owner, body.repo);
      return NextResponse.json({ source: "github", ...result });
    }
    if (body.source === "experience") {
      const result = await ingestMdxDir(database, join(process.cwd(), "content/experience"), "experience");
      return NextResponse.json({ source: "experience", ...result });
    }
    const result = await ingestMdxDir(database, join(process.cwd(), "content/snippets"), "snippet");
    return NextResponse.json({ source: "snippets", ...result });
  } catch (e) {
    console.error("[ingest]", e);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
