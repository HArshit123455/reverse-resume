"use client";

interface SuggestionChipsProps {
  prompts: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ prompts, onPick, disabled }: SuggestionChipsProps) {
  if (prompts.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        Try one of these
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="inline-flex items-center gap-2 rounded-pill border border-transparent bg-bg-sunk px-3.5 py-2 text-[13.5px] text-fg-soft transition-colors hover:border-border-strong hover:bg-bg-elev hover:text-fg disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
