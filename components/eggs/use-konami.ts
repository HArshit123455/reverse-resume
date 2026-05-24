"use client";

import { useEffect, useRef } from "react";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKonami(onComplete: () => void) {
  const idxRef = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) {
        idxRef.current = 0;
        return;
      }
      const expected = SEQUENCE[idxRef.current];
      const key = expected.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        idxRef.current++;
        if (idxRef.current === SEQUENCE.length) {
          idxRef.current = 0;
          onComplete();
        }
      } else {
        idxRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);
}
