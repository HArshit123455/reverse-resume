// components/chat-shell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { CitationsPanel, type CitationCard } from "./citations-panel";

interface Message { role: "user" | "assistant"; content: string }

export function ChatShell({ demoPrompts }: { demoPrompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [citations, setCitations] = useState<CitationCard[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    setStatusBanner(null);

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
          const json = evt.slice(6);
          const ev = JSON.parse(json);
          if (ev.type === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + ev.text };
              return copy;
            });
          } else if (ev.type === "citation") {
            setCitations((c) => {
              if (c.find((x) => x.n === ev.n)) return c;
              return [...c, { n: ev.n, chunk: ev.chunk }];
            });
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
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
      <div>
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {demoPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-sm px-3 py-1 border rounded-full hover:bg-neutral-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4 mt-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className="inline-block max-w-[90%] px-4 py-2 rounded-lg whitespace-pre-wrap text-left bg-neutral-100">
                {m.content || (m.role === "assistant" && busy ? "…" : "")}
              </div>
            </div>
          ))}
        </div>
        {statusBanner && (
          <div className="mt-4 p-3 border rounded text-sm text-amber-800 bg-amber-50">{statusBanner}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask anything about Harshit's work…"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button type="submit" disabled={busy || !input.trim()} className="px-4 py-2 border rounded">
            Ask
          </button>
        </form>
      </div>
      <CitationsPanel cards={citations} />
    </div>
  );
}
