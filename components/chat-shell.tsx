"use client";

import { useEffect, useRef, useState } from "react";
import { CitationsPanel } from "./citations-panel";
import { CitationsProvider, useCitations } from "./citations-context";
import { MarkdownMessage } from "./markdown-message";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ChatBody({ demoPrompts }: { demoPrompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { addCitation, clearCitations } = useCitations();

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    setStatusBanner(null);
    clearCitations();

    const ac = new AbortController();
    abortRef.current = ac;

    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        setStatusBanner("Failed to reach the server.");
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
          if (ev.type === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: copy[copy.length - 1].content + ev.text,
              };
              return copy;
            });
          } else if (ev.type === "citation") {
            addCitation({ n: ev.n, chunk: ev.chunk });
          } else if (ev.type === "rate_limited") {
            setStatusBanner(`Slow down — try again in ${ev.retryAfterSeconds}s.`);
          } else if (ev.type === "spend_capped") {
            setStatusBanner(ev.message);
          } else if (ev.type === "error") {
            setStatusBanner(ev.message);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setStatusBanner("Connection lost.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
      <div>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {demoPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-soft transition-colors hover:border-border-strong hover:text-text"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-code-bg px-4 py-2 text-text">
                  {m.content}
                </div>
              ) : m.content ? (
                <MarkdownMessage content={m.content} />
              ) : busy ? (
                <span className="text-muted">…</span>
              ) : null}
            </div>
          ))}
        </div>
        {statusBanner && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask anything about Harshit's work…"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Ask
            <span aria-hidden>→</span>
          </button>
        </form>
      </div>
      <CitationsPanel />
    </div>
  );
}

export function ChatShell({ demoPrompts }: { demoPrompts: string[] }) {
  return (
    <CitationsProvider>
      <ChatBody demoPrompts={demoPrompts} />
    </CitationsProvider>
  );
}
