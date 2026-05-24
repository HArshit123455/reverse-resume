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
            className="inline-flex items-center gap-2 rounded-[12px] border border-transparent bg-bg-sunk px-3 py-1.5 text-left text-[13px] leading-snug text-fg-soft transition-colors hover:border-border-strong hover:bg-bg-elev hover:text-fg disabled:opacity-50 sm:rounded-pill sm:px-3.5 sm:py-2 sm:text-[13.5px]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
