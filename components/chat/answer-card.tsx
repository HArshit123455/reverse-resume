"use client";

import { useState } from "react";
import { MarkdownMessage } from "../markdown-message";
import { ShikiCode } from "../shiki-code";
import type { TurnData } from "./turn";

type TabKey = "tldr" | "impact" | "code" | "story";

interface ImpactItem { num: string; unit: string; label: string }
interface ImpactState { status: "idle" | "loading" | "ready" | "error"; items: ImpactItem[] }
interface CodeChunk {
  file: string | null;
  language: string;
  code: string;
  sourceProject: string | null;
  sourceUrl: string | null;
}
interface CodeState { status: "idle" | "loading" | "ready" | "error"; chunk: CodeChunk | null }
interface StoryState { status: "idle" | "loading" | "streaming" | "ready" | "error"; text: string }

interface AnswerCardProps {
  turn: TurnData;
}

export function AnswerCard({ turn }: AnswerCardProps) {
  const [active, setActive] = useState<TabKey>("tldr");
  const [impact, setImpact] = useState<ImpactState>({ status: "idle", items: [] });
  const [code, setCode] = useState<CodeState>({ status: "idle", chunk: null });
  const [story, setStory] = useState<StoryState>({ status: "idle", text: "" });

  const ready = turn.status !== "streaming" && turn.chunkIds.length > 0;

  async function loadImpact() {
    if (impact.status !== "idle") return;
    setImpact({ status: "loading", items: [] });
    try {
      const res = await fetch("/api/chat/tab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: turn.q, chunkIds: turn.chunkIds, audience: turn.audience, tab: "impact" }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setImpact({ status: "ready", items });
    } catch {
      setImpact({ status: "error", items: [] });
    }
  }

  async function loadCode() {
    if (code.status !== "idle") return;
    setCode({ status: "loading", chunk: null });
    try {
      const res = await fetch("/api/chat/tab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: turn.q, chunkIds: turn.chunkIds, audience: turn.audience, tab: "code" }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setCode({ status: "ready", chunk: data.chunk ?? null });
    } catch {
      setCode({ status: "error", chunk: null });
    }
  }

  async function loadStory() {
    if (story.status !== "idle") return;
    setStory({ status: "loading", text: "" });
    try {
      const res = await fetch("/api/chat/tab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: turn.q, chunkIds: turn.chunkIds, audience: turn.audience, tab: "story" }),
      });
      if (!res.ok || !res.body) throw new Error(`status ${res.status}`);
      setStory({ status: "streaming", text: "" });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          if (!evt.startsWith("data: ")) continue;
          const parsed = JSON.parse(evt.slice(6));
          if (parsed.type === "token") {
            acc += parsed.text ?? "";
            setStory({ status: "streaming", text: acc });
          } else if (parsed.type === "error") {
            setStory({ status: "error", text: acc });
            return;
          }
        }
      }
      setStory({ status: "ready", text: acc });
    } catch {
      setStory({ status: "error", text: "" });
    }
  }

  function onTabClick(next: TabKey) {
    setActive(next);
    if (!ready) return;
    if (next === "impact") void loadImpact();
    if (next === "code") void loadCode();
    if (next === "story") void loadStory();
  }

  return (
    <div data-answer-card data-active-tab={active}>
      <div
        role="tablist"
        aria-label="Answer views"
        className="mb-3 inline-flex items-center gap-1 rounded-pill border border-border bg-bg-elev p-1 text-[12.5px]"
      >
        {(["tldr", "impact", "code", "story"] as const).map((k) => {
          const isActive = active === k;
          const disabled = k !== "tldr" && !ready;
          return (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${turn.id}-${k}`}
              id={`tab-${turn.id}-${k}`}
              disabled={disabled}
              onClick={() => onTabClick(k)}
              className={`rounded-pill px-3 py-1 transition-colors ${
                isActive
                  ? "bg-fg text-bg"
                  : "text-fg-soft hover:bg-bg-sunk hover:text-fg disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-fg-soft"
              }`}
            >
              {k === "tldr" ? "TL;DR" : k[0].toUpperCase() + k.slice(1)}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${turn.id}-tldr`}
        aria-labelledby={`tab-${turn.id}-tldr`}
        hidden={active !== "tldr"}
      >
        {turn.a ? (
          <MarkdownMessage content={turn.a} />
        ) : turn.status === "streaming" ? (
          <span className="text-muted" aria-live="polite">…</span>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${turn.id}-impact`}
        aria-labelledby={`tab-${turn.id}-impact`}
        hidden={active !== "impact"}
      >
        {impact.status === "loading" && <span className="text-muted">Extracting numbers…</span>}
        {impact.status === "error" && (
          <span className="text-muted">Couldn&apos;t extract numbers — see TL;DR.</span>
        )}
        {impact.status === "ready" && impact.items.length === 0 && (
          <span className="text-muted">No quantified outcomes in the cited sources.</span>
        )}
        {impact.status === "ready" && impact.items.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {impact.items.map((it, i) => (
              <li key={i} className="rounded-[12px] border border-border bg-bg-elev p-4">
                <div className="font-serif text-[32px] font-medium leading-none tracking-[-0.02em] text-fg">
                  {it.num}
                  {it.unit && (
                    <span className="ml-1 font-mono text-[14px] text-muted">{it.unit}</span>
                  )}
                </div>
                <div className="mt-2 text-[13px] text-fg-soft">{it.label}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${turn.id}-code`}
        aria-labelledby={`tab-${turn.id}-code`}
        hidden={active !== "code"}
      >
        {code.status === "loading" && <span className="text-muted">Finding the code…</span>}
        {code.status === "error" && (
          <span className="text-muted">Couldn&apos;t load the code excerpt.</span>
        )}
        {code.status === "ready" && !code.chunk && (
          <span className="text-muted">No code excerpt in the cited sources.</span>
        )}
        {code.status === "ready" && code.chunk && (
          <div>
            <div className="mb-2 font-mono text-[11.5px] text-muted">
              {code.chunk.sourceProject && <span>{code.chunk.sourceProject}</span>}
              {code.chunk.sourceProject && code.chunk.file && <span> · </span>}
              {code.chunk.file && <span>{code.chunk.file}</span>}
              {code.chunk.sourceUrl && (
                <>
                  <span> · </span>
                  <a
                    href={code.chunk.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    View on GitHub →
                  </a>
                </>
              )}
            </div>
            <ShikiCode code={code.chunk.code} language={code.chunk.language} />
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${turn.id}-story`}
        aria-labelledby={`tab-${turn.id}-story`}
        hidden={active !== "story"}
      >
        {story.status === "loading" && <span className="text-muted">Setting the scene…</span>}
        {story.status === "error" && story.text.length === 0 && (
          <span className="text-muted">Couldn&apos;t generate the story.</span>
        )}
        {(story.status === "streaming" ||
          story.status === "ready" ||
          (story.status === "error" && story.text.length > 0)) && (
          <MarkdownMessage content={story.text || "…"} />
        )}
      </div>
    </div>
  );
}
