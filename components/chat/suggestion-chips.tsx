"use client";

import { Icon } from "../ui/icon";

interface SuggestionChipsProps {
  prompts: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}

/** Quiet prompt links under the ask field: text first, no chip chrome. */
export function SuggestionChips({ prompts, onPick, disabled }: SuggestionChipsProps) {
  if (prompts.length === 0) return null;
  return (
    <ul aria-label="Suggested questions" className="flex flex-wrap justify-center gap-x-6 gap-y-2.5">
      {prompts.map((p) => (
        <li key={p}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="group inline-flex items-center gap-1 text-[14.5px] tracking-[-0.01em] text-fg-soft transition-colors duration-300 hover:text-fg disabled:opacity-40"
          >
            {p}
            <Icon
              name="chevron-right"
              className="h-3.5 w-3.5 text-muted-2 transition-transform duration-300 ease-stage group-hover:translate-x-0.5"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
