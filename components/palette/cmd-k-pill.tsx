"use client";

import { usePalette } from "../chrome-context";

export function CmdKPill() {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command palette"
      className="hidden h-7 items-center rounded-pill border border-border px-2.5 font-mono text-[11px] text-muted transition-colors duration-300 hover:border-border-strong hover:text-fg sm:inline-flex"
    >
      <kbd className="font-mono">⌘K</kbd>
    </button>
  );
}
