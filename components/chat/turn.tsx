"use client";

import type { Audience } from "@/lib/sse";
import { AnswerCard } from "./answer-card";

export interface TurnData {
  id: string;
  q: string;
  a: string;
  audience: Audience;
  chunkIds: string[];
  status: "streaming" | "done" | "error";
}

interface TurnProps {
  turn: TurnData;
}

/** One slide: the question is the title, the answer is the body. */
export function Turn({ turn }: TurnProps) {
  return (
    <article className="space-y-7" data-turn-id={turn.id}>
      <h2
        className="whitespace-pre-wrap text-[clamp(26px,3.4vw,38px)] font-bold leading-[1.1] tracking-[-0.03em] text-fg"
        data-audience={turn.audience}
      >
        {turn.q}
      </h2>
      <AnswerCard turn={turn} />
    </article>
  );
}
