"use client";

import type { Audience } from "@/lib/sse";

const OPTIONS: Array<{ value: Audience; label: string; blurb: string }> = [
  { value: "curious", label: "Curious", blurb: "Tell me a story" },
  { value: "recruiter", label: "Recruiter", blurb: "Show me outcomes" },
  { value: "engineer", label: "Engineer", blurb: "Show me code" },
];

interface AudiencePillsProps {
  audience: Audience;
  onChange: (next: Audience) => void;
}

/** A segmented control: one sliding thumb, three voices for the answer. */
export function AudiencePills({ audience, onChange }: AudiencePillsProps) {
  function handle(next: Audience) {
    onChange(next);
    try {
      localStorage.setItem("rr_audience", next);
    } catch {
      // localStorage unavailable (private mode, etc.) — silent fall-through
    }
  }

  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === audience));
  const active = OPTIONS[index];

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        role="radiogroup"
        aria-label="Choose audience"
        className="relative grid grid-cols-3 rounded-pill bg-bg-elev p-[3px]"
      >
        <span
          aria-hidden
          className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-pill bg-bg ring-1 ring-border transition-transform duration-500 ease-stage dark:bg-bg-sunk"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {OPTIONS.map((opt) => {
          const isActive = opt.value === audience;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${opt.label} — ${opt.blurb}`}
              onClick={() => handle(opt.value)}
              className={`relative z-[1] min-w-[92px] rounded-pill px-4 py-[7px] text-[14px] font-medium tracking-[-0.01em] transition-colors duration-300 sm:min-w-[112px] ${
                isActive ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted" aria-live="polite">
        {active.blurb}.
      </p>
    </div>
  );
}

export function readPersistedAudience(): Audience {
  if (typeof window === "undefined") return "curious";
  try {
    const raw = window.localStorage.getItem("rr_audience");
    if (raw === "curious" || raw === "recruiter" || raw === "engineer") return raw;
  } catch {
    // ignore
  }
  return "curious";
}
