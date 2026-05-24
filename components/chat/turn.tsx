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

export function Turn({ turn }: TurnProps) {
  return (
    <div className="space-y-5" data-turn-id={turn.id}>
      <div className="flex justify-end">
        <div
          className="max-w-[88%] whitespace-pre-wrap rounded-[18px_18px_6px_18px] border border-border bg-bg-sunk px-4 py-3 text-[14.5px] font-medium leading-[1.45] text-fg sm:max-w-[78%] sm:rounded-[20px_20px_6px_20px] sm:px-5 sm:text-[15px]"
          data-audience={turn.audience}
        >
          {turn.q}
        </div>
      </div>
      <AnswerCard turn={turn} />
    </div>
  );
}
