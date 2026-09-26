"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

interface StageRevealProps {
  children: ReactNode;
  className?: string;
  /** stagger inside one stage, in ms */
  delay?: number;
  as?: ElementType;
}

/**
 * The site's one entrance: a statement rises and un-blurs as its stage
 * scrolls in, once. Server markup renders visible (data-revealed is only set
 * to "false" after mount, and only when motion is allowed), so no-JS, print
 * and reduced-motion readers always see the content.
 */
export function StageReveal({ children, className, delay = 0, as: Tag = "div" }: StageRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || typeof IntersectionObserver === "undefined") return;
    // Already on screen at mount: leave it alone rather than flash it away.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return;
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setState("shown");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal
      data-revealed={state === "hidden" ? "false" : "true"}
      className={className}
      style={delay ? ({ ["--reveal-delay" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
