"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useInlineCommands } from "../eggs/use-inline-commands";
import { Icon } from "../ui/icon";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ onSubmit, disabled, placeholder, autoFocus }: ChatInputProps) {
  const [value, setValue] = useState("");
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
    <form
      onSubmit={onFormSubmit}
      className="group relative flex items-center rounded-pill bg-bg-elev ring-1 ring-transparent transition-[box-shadow,background-color] duration-300 focus-within:bg-bg focus-within:ring-1 focus-within:ring-border-strong has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-fg"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={1}
        autoFocus={autoFocus}
        aria-label="Ask a question about Harshit's work"
        placeholder={placeholder ?? "Ask about Harshit's work…"}
        className="h-16 flex-1 resize-none bg-transparent py-[19px] pl-7 pr-2 text-[17px] leading-[26px] tracking-[-0.015em] text-fg placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Ask"
        className="mr-2 inline-flex h-12 w-12 flex-none items-center justify-center rounded-pill bg-fg text-bg transition-[transform,opacity,background-color] duration-300 ease-stage hover:scale-[1.04] disabled:scale-100 disabled:bg-bg-sunk disabled:text-muted-2"
      >
        <Icon name="arrow-up" className="h-5 w-5" />
      </button>
    </form>
  );
}
