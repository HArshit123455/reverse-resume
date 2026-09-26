"use client";

import { usePalette } from "../chrome-context";

export function FooterCmdKTrigger() {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      className="text-fg-soft underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
    >
      Press ⌘K
    </button>
  );
}
