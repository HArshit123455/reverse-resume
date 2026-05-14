"use client";

import { useRef, useState } from "react";
import { useCitations } from "./citations-context";

interface CitationMarkerProps {
  n: number;
}

export function CitationMarker({ n }: CitationMarkerProps) {
  const { citations, focusCard } = useCitations();
  const card = citations.find((c) => c.n === n);
  const [hovered, setHovered] = useState(false);
  const timer = useRef<number | null>(null);

  if (!card) {
    return <sup className="text-muted">[{n}]</sup>;
  }

  function onEnter() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHovered(true), 150);
  }
  function onLeave() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHovered(false);
  }
  function onActivate() {
    focusCard(n);
  }

  const sourceLabel = card.chunk.title ?? card.chunk.filePath ?? "source";
  const meta = [card.chunk.sourceType, card.chunk.sourceProject].filter(Boolean).join(" · ");
  const preview = card.chunk.content.slice(0, 140);

  return (
    <sup className="relative inline-block">
      <button
        type="button"
        onClick={onActivate}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        aria-label={`Citation ${n}, view source ${sourceLabel}`}
        aria-describedby={hovered ? `cite-pop-${n}` : undefined}
        className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-accent-bg px-1.5 text-[10px] font-medium leading-none text-accent transition-colors hover:bg-accent hover:text-surface"
      >
        {n}
      </button>
      {hovered && (
        <span
          id={`cite-pop-${n}`}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-md bg-text px-3 py-2 text-xs leading-relaxed text-surface shadow-token [@media(hover:none)]:hidden"
        >
          <span className="mb-1 block font-medium">{sourceLabel}</span>
          {meta && <span className="mb-1.5 block text-[10px] text-muted">{meta}</span>}
          <span className="block">{preview}{card.chunk.content.length > 140 ? "…" : ""}</span>
        </span>
      )}
    </sup>
  );
}
