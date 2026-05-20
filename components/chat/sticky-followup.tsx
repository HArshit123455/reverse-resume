"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface StickyFollowupProps {
  onSubmit: (text: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function StickyFollowup({ onSubmit, onClear, disabled }: StickyFollowupProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setValue("");
    onSubmit(trimmed);
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

  return (
    <div
      data-sticky-followup
      className="z-[5] mt-8 sm:sticky sm:bottom-5 fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto"
    >
      <div className="rounded-[16px] border border-border bg-bg-elev/85 px-3 py-3 shadow-md backdrop-blur-xl sm:px-3">
        <form onSubmit={onFormSubmit} className="flex items-start gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Ask a follow-up…"
            className="flex-1 resize-none rounded-[12px] border border-border bg-bg px-4 py-3 text-[14.5px] leading-[1.5] text-fg placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="inline-flex items-center gap-2 rounded-[12px] bg-fg px-4 py-3 text-[13.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
          >
            Ask
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear thread and start over"
            className="inline-flex items-center justify-center rounded-[12px] border border-border px-3 py-3 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
          >
            Clear
          </button>
        </form>
      </div>
    </div>
  );
}
