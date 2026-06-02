"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { graphDecision, type GraphMode } from "./graph-decision";

const KnowledgeGraph = dynamic(
  () => import("./knowledge-graph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

const FALLBACK = (
  <p className="text-sm text-muted">Citations will appear here as the answer streams.</p>
);

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function KnowledgeGraphLazy() {
  const [mode, setMode] = useState<GraphMode>("none");

  useEffect(() => {
    const decide = () =>
      setMode(
        graphDecision({
          isDesktop: window.matchMedia("(min-width: 768px)").matches,
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          webgl: hasWebGL(),
        }),
      );
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (ric) {
      const id = ric(decide);
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = setTimeout(decide, 200);
    return () => clearTimeout(t);
  }, []);

  if (mode === "none") return FALLBACK;
  return <KnowledgeGraph animate={mode === "animate"} />;
}
