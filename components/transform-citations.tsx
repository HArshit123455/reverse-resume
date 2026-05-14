import { Children, isValidElement, type ReactNode } from "react";
import { CitationMarker } from "./citation-marker";

const CITE_RE = /\[(\d+)\]/g;

function transformString(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CITE_RE.lastIndex = 0;
  while ((match = CITE_RE.exec(s)) !== null) {
    if (match.index > lastIndex) parts.push(s.slice(lastIndex, match.index));
    parts.push(<CitationMarker key={`cite-${match.index}-${match[1]}`} n={Number(match[1])} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < s.length) parts.push(s.slice(lastIndex));
  return parts.length > 0 ? parts : [s];
}

export function transformCitations(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return transformString(child);
    if (typeof child === "number") return child;
    if (Array.isArray(child)) return transformCitations(child);
    if (isValidElement(child)) {
      // Do NOT recurse into <code> or <pre> children — citation markers inside code samples stay literal.
      const tag = typeof child.type === "string" ? child.type.toLowerCase() : "";
      if (tag === "code" || tag === "pre") return child;
      return child;
    }
    return child;
  });
}
