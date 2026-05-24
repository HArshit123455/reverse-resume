"use client";

import { usePalette } from "../chrome-context";

export function CmdKPill() {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      className="hidden items-center gap-1.5 rounded-pill border border-border bg-bg-elev px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-border-strong hover:text-fg sm:inline-flex"
    >
      <kbd className="font-mono">⌘K</kbd>
      <span aria-hidden>·</span>
      <span>commands</span>
    </button>
  );
}
