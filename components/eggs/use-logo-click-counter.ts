"use client";

import { useCallback, useRef, useState } from "react";

export const BRAND_CLICK_HINTS: Record<number, string> = {
  5: "Hi. The brand wasn't supposed to do anything. Now it does this.",
  10: "Ten clicks. Respect. There's one more.",
  15: "Try ⌘K. That's where I hid the actual interface.",
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
