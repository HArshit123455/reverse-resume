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
      className="fixed bottom-0 left-0 right-0 z-[5] mt-8 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:sticky sm:bottom-5 sm:left-auto sm:right-auto sm:px-0 sm:pb-0"
    >
      <div className="rounded-[14px] border border-border bg-bg-elev/85 p-2 shadow-md backdrop-blur-xl sm:rounded-[16px] sm:p-3">
        <form onSubmit={onFormSubmit} className="flex items-start gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Ask a follow-up…"
            className="flex-1 resize-none rounded-[10px] border border-border bg-bg px-3 py-2.5 text-[14px] leading-[1.5] text-fg placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft sm:rounded-[12px] sm:px-4 sm:py-3 sm:text-[14.5px]"
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Ask follow-up"
            className="inline-flex items-center gap-2 rounded-[10px] bg-fg px-3 py-2.5 text-[13.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50 sm:rounded-[12px] sm:px-4 sm:py-3"
          >
            <span className="hidden sm:inline">Ask</span>
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label="Clear thread and start over"
            title="Clear thread"
            className="inline-flex items-center justify-center rounded-[10px] border border-border px-2.5 py-2.5 text-[12.5px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50 sm:rounded-[12px] sm:px-3 sm:py-3 sm:text-[13px]"
          >
            <span aria-hidden className="sm:hidden">×</span>
            <span className="hidden sm:inline">Clear</span>
          </button>
        </form>
      </div>
    </div>
  );
}
