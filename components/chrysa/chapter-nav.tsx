"use client";

import { useEffect, useState } from "react";
import type { ChrysaChapter } from "@/lib/content/chrysa";

/** Sticky contents for the long read; the chapter you're in is drawn solid. */
export function ChapterNav({ chapters }: { chapters: ChrysaChapter[] }) {
  const [active, setActive] = useState<string>(chapters[0]?.id ?? "");

  useEffect(() => {
    const els = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // a chapter becomes current when its heading crosses the top third
      { rootMargin: "-10% 0px -66% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chapters]);

  return (
    <nav aria-label="Chapters" className="sticky top-24">
      <p className="mb-4 text-[13px] font-semibold tracking-[-0.01em] text-fg">In this story</p>
      <ol className="space-y-0.5 border-l border-border">
        {chapters.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`-ml-px block border-l py-1.5 pl-4 text-[14px] leading-snug transition-colors duration-300 ${
                  isActive
                    ? "border-fg font-medium text-fg"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {c.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
