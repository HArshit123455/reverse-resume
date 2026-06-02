// Evidence Constellation node data — the labels are REAL repos / projects / tech
// from this site's own corpus (the same things cited in the Sources rail and the
// /about timeline), so the cloud reads as a live index of the work, not decoration.

export interface ConstellationNode {
  /** Mono label — a real repo, project, file, or technology. */
  label: string;
  /** Small dimmed tag shown after a divider. */
  tag: string;
  /** Index 0 only: renders as the central "?" query node. */
  center?: boolean;
}

// Index 0 is the center "?" node; 1..9 are evidence cards.
export const CONSTELLATION_NODES: ConstellationNode[] = [
  { label: "ask", tag: "your question", center: true },
  { label: "reverse-resume", tag: "rag" },
  { label: "job-mcp", tag: "mcp server" },
  { label: "sla-engine", tag: "production" },
  { label: "outbox-dispatcher", tag: "queues" },
  { label: "pro-shop", tag: "mern" },
  { label: "Zykrr CX", tag: "~2 yrs" },
  { label: "pgvector", tag: "semantic" },
  { label: "token-bucket", tag: "rate-limit" },
  { label: "Anthropic SDK", tag: "agents" },
];

// Edges: [0, n] are dashed spokes from the center; the rest are solid cross-links.
export const CONSTELLATION_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
  [1, 2], [3, 4], [5, 6], [8, 9], [1, 4],
];
