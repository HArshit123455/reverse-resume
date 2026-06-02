"use client";

import { useEffect, useRef, useState } from "react";
import { ShikiCode } from "../shiki-code";
import { useCitations, type CitationCard } from "../citations-context";
import { KnowledgeGraphLazy } from "./knowledge-graph-lazy";

// Tag mapping: an explicit chunk.metadata.tag wins (allows per-MDX override);
// otherwise we fall back to a stable mapping from sourceType.
const TAG_FROM_SOURCE_TYPE: Record<CitationCard["chunk"]["sourceType"], string> = {
  github: "production",
  experience: "experience",
  snippet: "snippet",
};

function tagFor(card: CitationCard): string {
  const meta = card.chunk.metadata?.tag;
  if (typeof meta === "string" && meta.length > 0) return meta;
  return TAG_FROM_SOURCE_TYPE[card.chunk.sourceType];
}

function SourceCard({ card }: { card: CitationCard }) {
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
    if (isActive && !open) setOpen(true);
  }, [isActive, open]);

  return (
    <div
      ref={elRef}
      data-cite-n={card.n}
      data-active={isActive ? "true" : undefined}
      className={`rounded-[12px] border bg-bg-elev p-4 transition-all hover:border-border-strong ${
        isActive ? "border-accent ring-2 ring-accent/15 shadow-md" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded font-mono bg-accent-soft px-1.5 text-[10.5px] font-medium text-accent">
          {card.n}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
          {tagFor(card)}
        </span>
      </div>
      <div className="text-[13.5px] font-semibold leading-snug tracking-[-0.005em] text-fg">
        {card.chunk.title ?? card.chunk.filePath ?? "source"}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
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
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-fg transition-colors"
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

export function SourcesRail() {
  const { citations } = useCitations();

  const header = (
    <h2 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
      Sources
    </h2>
  );

  const empty = (
    <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
  );

  return (
    <>
      {/* Desktop: sticky right rail */}
      <aside className="hidden md:block sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4" data-sources-rail>
        {header}
        <div className="space-y-3">
          {citations.length === 0 ? <KnowledgeGraphLazy /> : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
      </aside>

      {/* Mobile: collapsed details accordion */}
      <details className="md:hidden mt-4 rounded-[12px] border border-border bg-bg-elev" data-sources-rail-mobile>
        <summary className="cursor-pointer list-none p-3 text-sm font-medium text-fg">
          <span className="mr-1.5 inline-block transition-transform [details[open]_&]:rotate-90" aria-hidden>▸</span>
          Sources ({citations.length})
        </summary>
        <div className="space-y-3 p-3 pt-0">
          {citations.length === 0 ? empty : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
      </details>
    </>
  );
}

// Re-export the type so existing imports still work during the migration
export type { CitationCard } from "../citations-context";
