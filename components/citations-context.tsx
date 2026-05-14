"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface CitationCard {
  n: number;
  chunk: {
    sourceType: "github" | "experience" | "snippet";
    sourceProject?: string | null;
    sourceUrl?: string | null;
    filePath?: string | null;
    title?: string | null;
    content: string;
    metadata?: Record<string, unknown>;
  };
}

interface CitationsContextValue {
  citations: CitationCard[];
  setCitations: (cards: CitationCard[]) => void;
  addCitation: (card: CitationCard) => void;
  clearCitations: () => void;
  registerCard: (n: number, el: HTMLElement | null) => void;
  focusCard: (n: number) => void;
  activeCardN: number | null;
}

const Ctx = createContext<CitationsContextValue | null>(null);

export function CitationsProvider({ children }: { children: ReactNode }) {
  const [citations, setCitations] = useState<CitationCard[]>([]);
  const [activeCardN, setActiveCardN] = useState<number | null>(null);
  const refs = useRef<Map<number, HTMLElement>>(new Map());

  const addCitation = useCallback((card: CitationCard) => {
    setCitations((prev) => (prev.find((c) => c.n === card.n) ? prev : [...prev, card]));
  }, []);

  const clearCitations = useCallback(() => {
    setCitations([]);
    refs.current.clear();
    setActiveCardN(null);
  }, []);

  const registerCard = useCallback((n: number, el: HTMLElement | null) => {
    if (el) refs.current.set(n, el);
    else refs.current.delete(n);
  }, []);

  const focusCard = useCallback((n: number) => {
    const el = refs.current.get(n);
    if (!el) return;
    // Open enclosing <details> on mobile if collapsed
    const details = el.closest("details");
    if (details && !details.open) details.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setActiveCardN(n);
    window.setTimeout(() => setActiveCardN((curr) => (curr === n ? null : curr)), 1600);
  }, []);

  const value = useMemo(
    () => ({ citations, setCitations, addCitation, clearCitations, registerCard, focusCard, activeCardN }),
    [citations, addCitation, clearCitations, registerCard, focusCard, activeCardN]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCitations(): CitationsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCitations must be used inside <CitationsProvider>");
  return v;
}
