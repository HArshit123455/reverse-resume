"use client";

import { useCallback, useRef, useState } from "react";

// Drafted hint copy — flagged in PR review for user tweak.
export const BRAND_CLICK_HINTS: Record<number, string> = {
  5: "You found the easter egg track. Keep going.",
  10: "Persistent. There's one more.",
  15: "Try ⌘K — the good stuff's in there.",
};

export function useLogoClickCounter(onHint: (message: string) => void) {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
    const hint = BRAND_CLICK_HINTS[countRef.current];
    if (hint) onHint(hint);
  }, [onHint]);

  return { count, increment };
}
