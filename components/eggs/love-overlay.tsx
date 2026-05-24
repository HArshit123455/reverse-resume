"use client";

import { useEffect, useMemo, type CSSProperties } from "react";

interface LoveOverlayProps {
  onDone: () => void;
}

export function LoveOverlay({ onDone }: LoveOverlayProps) {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.setAttribute("data-mode", "love");
    const duration = reduce ? 50 : 7000;
    const t = window.setTimeout(() => {
      document.documentElement.removeAttribute("data-mode");
      onDone();
    }, duration);
    return () => {
      window.clearTimeout(t);
      document.documentElement.removeAttribute("data-mode");
    };
  }, [onDone]);

  const hearts = useMemo(
    () =>
      Array.from({ length: 22 }).map(() => ({
        left: `${Math.round(Math.random() * 100)}%`,
        size: 18 + Math.round(Math.random() * 22),
        delay: `${Math.round(Math.random() * 2000)}ms`,
        dur: `${4500 + Math.round(Math.random() * 1800)}ms`,
      })),
    []
  );

  return (
    <div
      aria-hidden
      data-love-overlay
      className="pointer-events-none fixed inset-0 z-[150] overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(232,93,138,0) 30%, rgba(232,93,138,0.18) 100%)",
        }}
      />
      {hearts.map((h, i) => (
        <svg
          key={i}
          width={h.size}
          height={h.size}
          viewBox="0 0 24 24"
          data-egg-heart
          className="absolute bottom-[-40px] text-accent"
          style={
            {
              left: h.left,
              "--rr-dur": h.dur,
              "--rr-delay": h.delay,
            } as CSSProperties
          }
        >
          <path
            d="M12 21s-7-4.5-9.3-9.1C1 8.6 2.6 5 6 5c2 0 3.5 1.1 4.4 2.6C11.2 6.1 12.7 5 14.7 5 18.1 5 19.7 8.6 18.1 11.9 16 16.5 12 21 12 21Z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}

export default LoveOverlay;
