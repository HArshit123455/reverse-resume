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

  return (
    <div className="space-y-10">
      <Hero
        subheadline={subheadline}
        audience={audience}
        onAudienceChange={setAudience}
      />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <div>
          {empty ? (
            <div className="space-y-6">
              <SuggestionChips prompts={promptsForAudience} onPick={send} disabled={busy} />
              <ChatInput onSubmit={send} disabled={busy} autoFocus />
            </div>
          ) : (
            <div className="space-y-8">
              {turns.map((t) => (
                <Turn key={t.id} turn={t} />
              ))}
            </div>
          )}

          {statusBanner && (
            <div className="mt-4 flex items-center justify-between rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                aria-label="Dismiss"
                className="ml-3 text-amber-900/60 hover:text-amber-900 dark:text-amber-200/60 dark:hover:text-amber-200"
              >
                ×
              </button>
            </div>
          )}

          {!empty && (
            <StickyFollowup onSubmit={send} onClear={clearThread} disabled={busy} />
          )}
        </div>
        <SourcesRail />
      </div>
    </div>
  );
}

export function ChatShell(props: ChatShellProps) {
  return (
    <CitationsProvider>
      <Body {...props} />
    </CitationsProvider>
  );
}
