"use client";

import { useEffect, useRef, useState } from "react";
import { ShikiCode } from "../shiki-code";
import { Icon } from "../ui/icon";
import { useCitations, type CitationCard } from "../citations-context";

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

/** One footnote. The focused one is drawn solid; the rest stay quiet. */
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

  const meta = [card.chunk.sourceProject, card.chunk.filePath].filter(Boolean).join(" · ");

  return (
    <div
      ref={elRef}
      data-cite-n={card.n}
      data-active={isActive ? "true" : undefined}
      className={`rounded-[18px] bg-bg-elev p-5 ring-inset transition-[box-shadow] duration-500 ease-stage ${
        isActive ? "ring-2 ring-accent" : "ring-0"
      } ${open ? "sm:col-span-2" : ""}`}
    >
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
        <span
          className={`tabular mt-px font-mono text-[13px] font-medium ${isActive ? "text-accent" : "text-muted"}`}
        >
          {card.n}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-fg">
            {card.chunk.title ?? card.chunk.filePath ?? "source"}
          </div>
          <div className="mt-1 truncate text-[13px] text-muted">
            <span>{tagFor(card)}</span>
            {meta && <span> · {meta}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`cite-body-${card.n}`}
              className="inline-flex items-center gap-1 text-accent transition-opacity hover:opacity-75"
            >
              <Icon
                name="chevron-right"
                className={`h-3.5 w-3.5 transition-transform duration-300 ease-stage ${open ? "rotate-90" : ""}`}
              />
              <span>{open ? "Hide excerpt" : "Show excerpt"}</span>
            </button>
            {card.chunk.sourceUrl && (
              <a
                href={card.chunk.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent transition-opacity hover:opacity-75"
              >
                View on GitHub
                <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div id={`cite-body-${card.n}`} className="mt-4">
          <ShikiCode code={card.chunk.content} language={lang} />
        </div>
      )}
    </div>
  );
}

/** Footnotes for the latest answer: a grid on desktop, a disclosure on phones. */
export function SourcesRail() {
  const { citations } = useCitations();

  const empty = (
    <p className="text-[15px] text-muted">Sources appear here as the answer is written.</p>
  );

  return (
    <>
      <section aria-labelledby="sources-heading" className="hidden md:block" data-sources-rail>
        <h2 id="sources-heading" className="mb-5 text-[21px] font-semibold tracking-[-0.02em] text-fg">
          Sources
        </h2>
        {citations.length === 0 ? (
          empty
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {citations.map((c) => (
              <SourceCard key={c.n} card={c} />
            ))}
          </div>
        )}
      </section>

      <details className="group md:hidden" data-sources-rail-mobile>
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-[18px] bg-bg-elev px-5 py-4 text-[16px] font-semibold tracking-[-0.015em] text-fg">
          <span>
            Sources <span className="tabular font-normal text-muted">({citations.length})</span>
          </span>
          <Icon
            name="chevron-right"
            className="h-4 w-4 text-muted transition-transform duration-300 group-open:rotate-90"
          />
        </summary>
        <div className="mt-3 space-y-3">
          {citations.length === 0 ? empty : citations.map((c) => <SourceCard key={c.n} card={c} />)}
        </div>
      </details>
    </>
  );
}

// Re-export the type so existing imports still work during the migration
export type { CitationCard } from "../citations-context";
