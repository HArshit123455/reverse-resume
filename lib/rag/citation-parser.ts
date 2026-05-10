import type { RetrievedChunk } from "./retrieve";

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "citation"; n: number; chunk: RetrievedChunk };

/**
 * Streams text deltas while detecting [n] citation tags. Emits a `citation`
 * event the first time each tag appears. Handles tags split across chunks
 * by buffering an unbounded-but-trivial tail.
 */
export class CitationStreamParser {
  private buffer = "";
  private emitted = new Set<number>();

  constructor(private readonly chunks: RetrievedChunk[]) {}

  *feed(delta: string): Generator<StreamEvent> {
    this.buffer += delta;
    while (true) {
      const open = this.buffer.indexOf("[");
      if (open === -1) {
        if (this.buffer.length > 0) {
          yield { type: "token", text: this.buffer };
          this.buffer = "";
        }
        return;
      }
      // Emit text up to the bracket
      if (open > 0) {
        yield { type: "token", text: this.buffer.slice(0, open) };
        this.buffer = this.buffer.slice(open);
      }
      // Now buffer starts with "["
      const close = this.buffer.indexOf("]");
      if (close === -1) {
        // Tag may continue in next delta — keep buffering
        return;
      }
      const inner = this.buffer.slice(1, close);
      const n = Number(inner);
      const tagText = this.buffer.slice(0, close + 1);
      yield { type: "token", text: tagText };
      if (Number.isInteger(n) && n >= 1 && n <= this.chunks.length && !this.emitted.has(n)) {
        this.emitted.add(n);
        yield { type: "citation", n, chunk: this.chunks[n - 1] };
      }
      this.buffer = this.buffer.slice(close + 1);
    }
  }

  *flush(): Generator<StreamEvent> {
    if (this.buffer.length > 0) {
      yield { type: "token", text: this.buffer };
      this.buffer = "";
    }
  }
}
