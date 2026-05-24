"use client";

import { createContext, useContext } from "react";

export interface PaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export interface EggsContextValue {
  triggerSparkle: () => void;
  triggerLove: () => void;
  triggerMatrix: () => void;
}

export const PaletteContext = createContext<PaletteContextValue | null>(null);
export const EggsContext = createContext<EggsContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used inside <Chrome>");
  return ctx;
}

export function useEggs(): EggsContextValue {
  const ctx = useContext(EggsContext);
  if (!ctx) throw new Error("useEggs must be used inside <Chrome>");
  return ctx;
}
