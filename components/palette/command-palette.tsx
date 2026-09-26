"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CommandList } from "./command-list";
import { COMMAND_CATALOG, filterCommands } from "./commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onFire: (commandId: string) => void;
}

export function CommandPalette({ open, onClose, onFire }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const visible = useMemo(() => filterCommands(COMMAND_CATALOG, query), [query]);

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    setQuery("");
    setActiveId(filterCommands(COMMAND_CATALOG, "")[0]?.id ?? null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (visible.length === 0) {
      setActiveId(null);
    } else if (!visible.some((c) => c.id === activeId)) {
      setActiveId(visible[0].id);
    }
  }, [visible, activeId, open]);

  useEffect(() => {
    if (open) return;
    lastFocusedRef.current?.focus?.();
  }, [open]);

  // Escape closes the palette wherever focus is (clicking the dimmed page
  // moves focus to <body>, where the dialog's own key handler never hears it).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function move(delta: number) {
    if (visible.length === 0) return;
    const idx = visible.findIndex((c) => c.id === activeId);
    const next = ((idx < 0 ? 0 : idx) + delta + visible.length) % visible.length;
    setActiveId(visible[next].id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeId) onFire(activeId);
    } else if (e.key === "Tab") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
    >
      {/* The scrim covers the wrapper, so it owns the outside click. */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" aria-hidden onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-[600px] overflow-hidden rounded-[22px] bg-bg ring-1 ring-border-strong"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span aria-hidden className="font-mono text-[12px] text-muted">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, or search…"
            aria-label="Search commands"
            className="flex-1 bg-transparent text-[17px] tracking-[-0.015em] text-fg placeholder:text-muted focus:outline-none"
          />
        </div>
        <CommandList
          commands={visible}
          activeId={activeId}
          onActivate={setActiveId}
          onFire={onFire}
        />
      </div>
    </div>
  );
}
