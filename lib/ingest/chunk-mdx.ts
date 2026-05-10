import matter from "gray-matter";
import { createHash } from "node:crypto";

export interface MdxChunk {
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
}

export function chunkMdx(raw: string, filePath: string): MdxChunk[] {
  const parsed = matter(raw);
  const frontmatter = parsed.data;
  const body = parsed.content;

  const lines = body.split("\n");
  const sections: { heading?: string; lines: string[] }[] = [{ lines: [] }];

  let inFence = false;
  for (const line of lines) {
    if (line.startsWith("```") || line.startsWith("~~~")) inFence = !inFence;
    const h2Match = !inFence ? line.match(/^##\s+(.+)$/) : null;
    if (h2Match) {
      sections.push({ heading: h2Match[1].trim(), lines: [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  const chunks: MdxChunk[] = [];
  for (const section of sections) {
    const content = section.lines.join("\n").trim();
    if (!content) continue;
    const headingPrefix = section.heading ? `## ${section.heading}\n\n` : "";
    const fullContent = headingPrefix + content;
    chunks.push({
      content: fullContent,
      contentHash: createHash("sha256")
        .update(`${filePath}::${section.heading ?? ""}::${fullContent}`)
        .digest("hex"),
      metadata: {
        ...frontmatter,
        heading: section.heading,
        filePath,
      },
    });
  }

  return chunks;
}
