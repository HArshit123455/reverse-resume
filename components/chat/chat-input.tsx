"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ onSubmit, disabled, placeholder, autoFocus }: ChatInputProps) {
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
    <form onSubmit={onFormSubmit} className="flex items-start gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Ask anything about Harshit's work…"}
        className="flex-1 resize-none rounded-[16px] border border-border bg-bg-elev px-5 py-[18px] text-[15.5px] leading-[1.5] text-fg placeholder:text-muted-2 transition-all focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex items-center gap-2.5 rounded-[16px] bg-fg px-6 py-[18px] text-[14.5px] font-semibold text-bg transition-transform hover:-translate-y-px disabled:opacity-50"
      >
        Ask
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
