import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import { createHash } from "node:crypto";

export interface CodeChunk {
  content: string;
  contentHash: string;
  metadata: {
    filePath: string;
    language: string;
    symbol?: string;
    startLine?: number;
    endLine?: number;
    chunkStrategy: "tree-sitter" | "sliding-window";
  };
}

const SLIDING_WINDOW_LINES = 80;
const SLIDING_WINDOW_OVERLAP = 10;

export function chunkCode(source: string, filePath: string, language: string): CodeChunk[] {
  if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
    try {
      return chunkWithTreeSitter(source, filePath, language);
    } catch {
      // fall through to sliding window on parse error
    }
  }
  return chunkWithSlidingWindow(source, filePath, language);
}

function chunkWithTreeSitter(source: string, filePath: string, language: string): CodeChunk[] {
  const parser = new Parser();
  const grammar = language === "tsx" ? TypeScript.tsx : TypeScript.typescript;
  parser.setLanguage(grammar);
  const tree = parser.parse(source);
  const chunks: CodeChunk[] = [];

  const TARGET_NODES = new Set([
    "function_declaration",
    "class_declaration",
    "interface_declaration",
    "type_alias_declaration",
    "enum_declaration",
    "lexical_declaration",
    "export_statement",
  ]);

  function pushChunk(node: Parser.SyntaxNode, symbol: string | undefined) {
    const content = source.slice(node.startIndex, node.endIndex);
    if (content.trim().length < 20) return;
    chunks.push({
      content,
      contentHash: createHash("sha256")
        .update(`${filePath}::${node.startPosition.row}::${content}`)
        .digest("hex"),
      metadata: {
        filePath,
        language,
        symbol,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        chunkStrategy: "tree-sitter",
      },
    });
  }

  function getSymbolName(node: Parser.SyntaxNode): string | undefined {
    const nameNode =
      node.childForFieldName("name") ??
      node.descendantsOfType("identifier")[0] ??
      node.descendantsOfType("type_identifier")[0];
    return nameNode?.text;
  }

  for (const child of tree.rootNode.namedChildren) {
    let target = child;
    if (child.type === "export_statement" && child.namedChildren.length > 0) {
      target = child.namedChildren[0];
    }
    if (TARGET_NODES.has(target.type) || TARGET_NODES.has(child.type)) {
      pushChunk(child, getSymbolName(target));
    }
  }

  if (chunks.length === 0) return chunkWithSlidingWindow(source, filePath, language);
  return chunks;
}

function chunkWithSlidingWindow(source: string, filePath: string, language: string): CodeChunk[] {
  const lines = source.split("\n");
  const chunks: CodeChunk[] = [];
  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + SLIDING_WINDOW_LINES, lines.length);
    const content = lines.slice(start, end).join("\n");
    if (content.trim().length > 0) {
      chunks.push({
        content,
        contentHash: createHash("sha256").update(`${filePath}::${start}::${content}`).digest("hex"),
        metadata: {
          filePath,
          language,
          startLine: start + 1,
          endLine: end,
          chunkStrategy: "sliding-window",
        },
      });
    }
    if (end >= lines.length) break;
    start = end - SLIDING_WINDOW_OVERLAP;
  }
  return chunks;
}
