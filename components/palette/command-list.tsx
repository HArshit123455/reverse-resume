"use client";

import { useEffect, useRef } from "react";
import type { Command } from "./commands";
import { SECTION_ORDER } from "./commands";

interface CommandListProps {
  commands: Command[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onFire: (id: string) => void;
}

export function CommandList({ commands, activeId, onActivate, onFire }: CommandListProps) {
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: commands.filter((c) => c.section === section),
  })).filter((g) => g.items.length > 0);

  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  if (grouped.length === 0) {
    return (
      <div className="px-4 py-8 text-center font-mono text-[12px] text-muted">
        No matches.
      </div>
    );
  }

  return (
    <div role="listbox" aria-label="Commands" className="max-h-[420px] overflow-y-auto py-2">
      {grouped.map((group) => (
        <div key={group.section}>
          <div className="px-4 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
            {group.section}
          </div>
          <ul>
            {group.items.map((cmd) => {
              const active = cmd.id === activeId;
              return (
                <li key={cmd.id}>
                  <button
                    ref={active ? activeRef : null}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-command-id={cmd.id}
                    onMouseMove={() => onActivate(cmd.id)}
                    onClick={() => onFire(cmd.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[14px] transition-colors ${
                      active ? "bg-accent-soft text-accent" : "text-fg-soft hover:bg-bg-sunk"
                    }`}
                  >
                    <span>{cmd.label}</span>
                    {cmd.kbd ? (
                      <kbd className="rounded-[6px] border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-muted">
                        {cmd.kbd}
                      </kbd>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
