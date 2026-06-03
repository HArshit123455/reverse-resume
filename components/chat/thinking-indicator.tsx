"use client";

import { useEffect, useState } from "react";

type Phase = "retrieving" | "generating";

// Blend of domain-specific and playful verbs, one list per real pipeline phase.
// `retrieving` runs until the SSE `init` event lands chunk IDs; `generating`
// runs from there until the first answer token arrives.
const VERBS: Record<Phase, string[]> = {
  retrieving: [
    "Reading the codebase…",
    "Searching commits…",
    "Thinking…",
    "Pulling the right sources…",
  ],
  generating: [
    "Connecting the dots…",
    "Writing the answer…",
    "Citing sources…",
    "Almost there…",
  ],
};

const ROTATE_MS = 2000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function ThinkingIndicator({ phase }: { phase: Phase }) {
  const verbs = VERBS[phase];
  const [index, setIndex] = useState(0);

  // Restart the sequence whenever the phase flips (retrieving → generating).
  useEffect(() => {
    setIndex(0);
  }, [phase]);

  // Advance through the current phase's verbs, holding on the last one so a
  // long wait doesn't loop back to the start. Skipped under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, verbs.length - 1));
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [verbs]);

  const verb = verbs[Math.min(index, verbs.length - 1)];

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 text-[14px] text-muted"
    >
      <span className="sr-only">Working on your answer…</span>
      <span className="thinking-dot" aria-hidden />
      <span key={verb} className="thinking-verb" aria-hidden>
        {verb}
      </span>
    </span>
  );
}
