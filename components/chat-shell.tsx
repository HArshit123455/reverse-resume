"use client";

import { useEffect, useRef, useState } from "react";
import { CitationsProvider, useCitations } from "./citations-context";
import { Hero } from "./hero";
import { SourcesRail } from "./chat/sources-rail";
import { SuggestionChips } from "./chat/suggestion-chips";
import { ChatInput } from "./chat/chat-input";
import { StickyFollowup } from "./chat/sticky-followup";
import { Turn, type TurnData } from "./chat/turn";
import { readPersistedAudience } from "./chat/audience-pills";
import { Icon } from "./ui/icon";
import type { Audience } from "@/lib/sse";

export interface SuggestionChipsByAudience {
  curious: string[];
  recruiter: string[];
  engineer: string[];
}

interface ChatShellProps {
  subheadline: string;
  suggestionChips: SuggestionChipsByAudience;
}

function Body({ subheadline, suggestionChips }: ChatShellProps) {
  const [audience, setAudience] = useState<Audience>("curious");
  const [turns, setTurns] = useState<TurnData[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { addCitation, clearCitations } = useCitations();

  // Read persisted audience after mount (SSR-safe — see theme-toggle precedent)
  useEffect(() => {
    setAudience(readPersistedAudience());
  }, []);

  function patchLastTurn(patch: (t: TurnData) => TurnData) {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const copy = prev.slice();
      copy[copy.length - 1] = patch(copy[copy.length - 1]);
      return copy;
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setStatusBanner(null);
    clearCitations();

    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newTurn: TurnData = {
      id,
      q: text,
      a: "",
      audience,
      chunkIds: [],
      status: "streaming",
    };
    const nextTurns = [...turns, newTurn];
    setTurns(nextTurns);

    // Build the wire-format history from completed turns + the new question.
    const history = nextTurns.flatMap((t) =>
      t === newTurn
        ? [{ role: "user" as const, content: t.q }]
        : [
            { role: "user" as const, content: t.q },
            { role: "assistant" as const, content: t.a },
          ]
    );

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, audience }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        setStatusBanner("Failed to reach the server.");
        patchLastTurn((t) => ({ ...t, status: "error" }));
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          if (!evt.startsWith("data: ")) continue;
          const ev = JSON.parse(evt.slice(6));
          if (ev.type === "init") {
            patchLastTurn((t) => ({ ...t, id: ev.messageId, chunkIds: ev.chunkIds }));
          } else if (ev.type === "token") {
            patchLastTurn((t) => ({ ...t, a: t.a + ev.text }));
          } else if (ev.type === "citation") {
            addCitation({ n: ev.n, chunk: ev.chunk });
          } else if (ev.type === "rate_limited") {
            setStatusBanner(`Slow down — try again in ${ev.retryAfterSeconds}s.`);
          } else if (ev.type === "spend_capped") {
            setStatusBanner(ev.message);
          } else if (ev.type === "error") {
            setStatusBanner(ev.message);
            patchLastTurn((t) => ({ ...t, status: "error" }));
          } else if (ev.type === "done") {
            patchLastTurn((t) => (t.status === "streaming" ? { ...t, status: "done" } : t));
          }
        }
      }
      // If the stream closed without emitting "done" (server abort, etc.) make
      // sure the last turn is no longer marked "streaming" so the placeholder
      // doesn't get stuck.
      patchLastTurn((t) => (t.status === "streaming" ? { ...t, status: "done" } : t));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStatusBanner("Connection lost.");
        patchLastTurn((t) => ({ ...t, status: "error" }));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function clearThread() {
    abortRef.current?.abort();
    setTurns([]);
    clearCitations();
    setStatusBanner(null);
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  const promptsForAudience = suggestionChips[audience] ?? [];
  const empty = turns.length === 0;

  const bannerEl = statusBanner ? (
    <div
      role="status"
      className="flex items-center justify-between gap-4 rounded-[18px] bg-bg-elev px-5 py-3.5 text-[15px] text-fg"
    >
      <span className="flex items-center gap-2.5">
        <span className="h-2 w-2 flex-none rounded-full bg-[#ff9f0a]" aria-hidden />
        {statusBanner}
      </span>
      <button
        type="button"
        onClick={() => setStatusBanner(null)}
        aria-label="Dismiss"
        className="inline-flex h-7 w-7 items-center justify-center rounded-pill text-muted transition-colors hover:text-fg"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  if (empty) {
    // Stage one: the whole first viewport is the question.
    return (
      <section
        aria-label="Ask"
        className="flex min-h-[calc(100svh-48px)] flex-col justify-center px-5 pb-16 pt-14 sm:px-8"
      >
        <div className="mx-auto w-full max-w-[860px]">
          <Hero subheadline={subheadline} audience={audience} onAudienceChange={setAudience} />
          <div
            className="stage-in mx-auto mt-10 max-w-[680px] space-y-8"
            style={{ ["--reveal-delay" as string]: "320ms" }}
          >
            <ChatInput onSubmit={send} disabled={busy} autoFocus />
            <SuggestionChips prompts={promptsForAudience} onPick={send} disabled={busy} />
            {bannerEl}
          </div>
        </div>
      </section>
    );
  }

  // In conversation: the statement steps back, each answer is the next slide,
  // and the footnotes for the latest answer close the thread.
  return (
    <section aria-label="Conversation" className="px-5 pb-10 pt-14 sm:px-8 sm:pt-20">
      <div className="mx-auto w-full max-w-[760px]">
        <Hero
          compact
          subheadline={subheadline}
          audience={audience}
          onAudienceChange={setAudience}
        />
        <div className="mt-16 space-y-20 pb-28 sm:pb-0">
          {turns.map((t) => (
            <Turn key={t.id} turn={t} />
          ))}
        </div>
        {bannerEl ? <div className="mt-8">{bannerEl}</div> : null}
        <div className="mt-14">
          <SourcesRail />
        </div>
        <div className="mt-10">
          <StickyFollowup onSubmit={send} onClear={clearThread} disabled={busy} />
        </div>
      </div>
    </section>
  );
}

export function ChatShell(props: ChatShellProps) {
  return (
    <CitationsProvider>
      <Body {...props} />
    </CitationsProvider>
  );
}
