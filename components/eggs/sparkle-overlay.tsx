"use client";

import { useEffect, useMemo } from "react";

interface SparkleOverlayProps {
  onDone: () => void;
}

export function SparkleOverlay({ onDone }: SparkleOverlayProps) {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(onDone, reduce ? 50 : 3200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  // Stable random positions across re-renders within this mount.
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => ({
        left: `${Math.round(Math.random() * 100)}%`,
        top: `${Math.round(Math.random() * 100)}%`,
        size: 16 + Math.round(Math.random() * 18),
        delay: `${Math.round(Math.random() * 1200)}ms`,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[150]">
      {sparkles.map((s, i) => (
        <svg
          key={i}
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          data-egg-sparkle
          className="absolute text-accent"
          style={{ left: s.left, top: s.top, animationDelay: s.delay }}
        >
          <path
            d="M12 2 L13.6 9.4 21 11 13.6 12.6 12 20 10.4 12.6 3 11 10.4 9.4 Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}

export default SparkleOverlay;
