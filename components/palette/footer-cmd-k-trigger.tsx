"use client";

import { usePalette } from "../chrome-context";

export function FooterCmdKTrigger() {
  const { open } = usePalette();
  return (
    <button
      type="button"
      onClick={open}
      className="text-accent underline-offset-2 transition-opacity hover:opacity-80 focus-visible:underline"
    >
      press ⌘K
    </button>
  );
}
