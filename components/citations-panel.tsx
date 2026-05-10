// components/citations-panel.tsx
"use client";

import { useState } from "react";
import { CodeBlock } from "./code-block";

export interface CitationCard {
  n: number;
  chunk: {
    sourceType: "github" | "experience" | "snippet";
    sourceProject?: string | null;
    sourceUrl?: string | null;
    filePath?: string | null;
    title?: string | null;
    content: string;
    metadata?: Record<string, unknown>;
  };
}

const BADGE_LABEL: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "Code on GitHub",
  experience: "Professional experience",
  snippet: "Code excerpt (sanitized)",
};

const BADGE_COLOR: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "bg-emerald-100 text-emerald-800",
  experience: "bg-sky-100 text-sky-800",
  snippet: "bg-amber-100 text-amber-800",
};

export function CitationsPanel({ cards }: { cards: CitationCard[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  return (
    <aside className="space-y-3">
      <h2 className="text-xs uppercase tracking-wide text-neutral-500">Sources</h2>
      {cards.length === 0 && (
        <p className="text-sm text-neutral-400">Citations will appear here as the answer streams.</p>
      )}
      {cards.map((card) => {
        const isOpen = expanded.has(card.n);
        const lang = (card.chunk.metadata?.language as string) ?? undefined;
        return (
          <div key={card.n} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded ${BADGE_COLOR[card.chunk.sourceType]}`}>
                [{card.n}] {BADGE_LABEL[card.chunk.sourceType]}
              </span>
              {card.chunk.sourceUrl && (
                <a
                  href={card.chunk.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on GitHub →
                </a>
              )}
            </div>
            <div className="font-medium">{card.chunk.title ?? card.chunk.filePath}</div>
            {card.chunk.sourceProject && (
              <div className="text-xs text-neutral-500">{card.chunk.sourceProject}</div>
            )}
            <button
              onClick={() => setExpanded((s) => {
                const next = new Set(s);
                next.has(card.n) ? next.delete(card.n) : next.add(card.n);
                return next;
              })}
              aria-label={isOpen ? `Hide excerpt for citation ${card.n}` : `Show excerpt for citation ${card.n}`}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              {isOpen ? "Hide excerpt" : "Show excerpt"}
            </button>
            {isOpen && (
              <div className="mt-2">
                <CodeBlock code={card.chunk.content} language={lang} />
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
