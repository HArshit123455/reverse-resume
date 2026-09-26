"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "../ui/icon";
import { useInlineCommands } from "../eggs/use-inline-commands";

interface StickyFollowupProps {
  onSubmit: (text: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function StickyFollowup({ onSubmit, onClear, disabled }: StickyFollowupProps) {
  const [value, setValue] = useState("");
  // love words and sudo/whoami get their easter egg here too, not a paid API call
  const wrappedSubmit = useInlineCommands(onSubmit);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    wrappedSubmit(trimmed);
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      data-sticky-followup
      className="fixed inset-x-0 bottom-0 z-[5] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:sticky sm:bottom-6 sm:px-0 sm:pb-0"
    >
      <form
        onSubmit={onFormSubmit}
        className="flex items-center gap-1.5 rounded-pill bg-nav p-1.5 ring-1 ring-border backdrop-blur-xl backdrop-saturate-[1.8] transition-shadow duration-300 focus-within:ring-2 focus-within:ring-fg"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="Ask a follow-up question"
          placeholder="Ask a follow-up…"
          className="h-11 flex-1 resize-none bg-transparent py-[10px] pl-4 text-[16px] leading-6 tracking-[-0.012em] text-fg placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          aria-label="Clear thread and start over"
          title="Clear thread"
          className="inline-flex h-10 items-center justify-center rounded-pill px-3 text-[14px] text-fg-soft transition-colors hover:text-fg disabled:opacity-40"
        >
          <Icon name="x" className="h-4 w-4 sm:hidden" />
          <span className="hidden sm:inline">Clear</span>
        </button>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Ask follow-up"
          className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-fg text-bg transition-[transform,background-color] duration-300 ease-stage hover:scale-[1.04] disabled:scale-100 disabled:bg-bg-sunk disabled:text-muted-2"
        >
          <Icon name="arrow-up" className="h-[18px] w-[18px]" />
        </button>
      </form>
    </div>
  );
}
