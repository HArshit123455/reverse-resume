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

export function AudiencePills({ audience, onChange }: AudiencePillsProps) {
  function handle(next: Audience) {
    onChange(next);
    try {
      localStorage.setItem("rr_audience", next);
    } catch {
      // localStorage unavailable (private mode, etc.) — silent fall-through
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose audience"
      className="inline-flex flex-wrap items-center gap-0.5 rounded-pill border border-border bg-bg-elev p-1"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === audience;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} — ${opt.blurb}`}
            onClick={() => handle(opt.value)}
            className={`inline-flex items-baseline gap-2 rounded-pill px-3 py-1.5 text-[13px] transition-colors sm:px-3.5 ${
              active
                ? "bg-fg text-bg"
                : "text-fg-soft hover:bg-bg-sunk hover:text-fg"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
            <span className={`hidden text-[11px] sm:inline ${active ? "text-bg/70" : "text-muted"}`}>{opt.blurb}</span>
          </button>
        );
      })}
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
