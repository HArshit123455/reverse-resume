export type NodeGroup = "self" | "repo" | "leaf";

export interface GraphNode {
  id: string;
  label: string;
  group: NodeGroup;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const GRAPH: GraphData = {
  nodes: [
    { id: "me", label: "me", group: "self" },
    { id: "reverse-resume", label: "reverse-resume", group: "repo" },
    { id: "job-mcp", label: "job-mcp", group: "repo" },
    { id: "sla-engine", label: "sla-engine", group: "repo" },
    { id: "outbox", label: "outbox-dispatcher", group: "repo" },
    { id: "pro-shop", label: "pro-shop", group: "repo" },
    { id: "rag", label: "RAG", group: "leaf" },
    { id: "mcp", label: "MCP", group: "leaf" },
    { id: "queues", label: "queues", group: "leaf" },
    { id: "caching", label: "caching", group: "leaf" },
    { id: "payments", label: "payments", group: "leaf" },
  ],
  edges: [
    { from: "me", to: "reverse-resume" },
    { from: "me", to: "job-mcp" },
    { from: "me", to: "sla-engine" },
    { from: "me", to: "outbox" },
    { from: "me", to: "pro-shop" },
    { from: "reverse-resume", to: "rag" },
    { from: "job-mcp", to: "mcp" },
    { from: "sla-engine", to: "queues" },
    { from: "outbox", to: "queues" },
    { from: "sla-engine", to: "caching" },
    { from: "pro-shop", to: "payments" },
  ],
};
