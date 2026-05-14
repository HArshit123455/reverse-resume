"use client";

import { useEffect, useRef, useState } from "react";
import { ShikiCode } from "./shiki-code";
import { useCitations, type CitationCard } from "./citations-context";

const BADGE_LABEL: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "github",
  experience: "experience",
  snippet: "snippet",
};

const BADGE_COLOR: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  experience: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300",
  snippet: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
};

function CitationCardView({ card }: { card: CitationCard }) {
  const { registerCard, activeCardN } = useCitations();
  const elRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const isActive = activeCardN === card.n;
  const lang = (card.chunk.metadata?.language as string) ?? undefined;

  useEffect(() => {
    registerCard(card.n, elRef.current);
    return () => registerCard(card.n, null);
  }, [card.n, registerCard]);

  useEffect(() => {
    // Auto-expand on activation so the user sees the excerpt immediately
    if (isActive && !open) setOpen(true);
  }, [isActive, open]);

  return (
    <div
      ref={elRef}
      data-cite-n={card.n}
      data-active={isActive ? "true" : undefined}
      className={`rounded-lg border bg-surface p-4 shadow-token transition-shadow ${
        isActive ? "border-accent ring-2 ring-accent/15" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-accent-bg px-1.5 text-[11px] font-semibold text-accent">
          {card.n}
        </span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-medium tracking-wide ${BADGE_COLOR[card.chunk.sourceType]}`}>
          {BADGE_LABEL[card.chunk.sourceType]}
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug text-text">
        {card.chunk.title ?? card.chunk.filePath}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-text-soft">
        {card.chunk.sourceProject && <span>{card.chunk.sourceProject}</span>}
        {card.chunk.sourceProject && card.chunk.filePath && <span>·</span>}
        {card.chunk.filePath && <span className="truncate">{card.chunk.filePath}</span>}
        {card.chunk.sourceUrl && (
          <>
            <span>·</span>
            <a href={card.chunk.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              View on GitHub →
            </a>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`cite-body-${card.n}`}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-text-soft hover:text-text"
      >
        <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <span>{open ? "Hide excerpt" : "Show excerpt"}</span>
      </button>
      {open && (
        <div id={`cite-body-${card.n}`} className="mt-2">
          <ShikiCode code={card.chunk.content} language={lang} />
        </div>
      )}
    </div>
  );
}

export function CitationsPanel() {
  const { citations } = useCitations();

  const header = (
    <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
      Sources
    </h2>
  );

  const empty = (
    <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
  );

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside className="hidden md:block sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
        {header}
        <div className="space-y-3">
          {citations.length === 0 ? empty : citations.map((c) => <CitationCardView key={c.n} card={c} />)}
        </div>
      </aside>

      {/* Mobile: collapsed details accordion */}
      <details className="md:hidden mt-4 rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer list-none p-3 text-sm font-medium text-text">
          <span className="mr-1.5 inline-block transition-transform [details[open]_&]:rotate-90" aria-hidden>▸</span>
          Sources ({citations.length})
        </summary>
        <div className="space-y-3 p-3 pt-0">
          {citations.length === 0 ? empty : citations.map((c) => <CitationCardView key={c.n} card={c} />)}
        </div>
      </details>
    </>
  );
}

// Re-export the type so existing imports still work
export type { CitationCard } from "./citations-context";
