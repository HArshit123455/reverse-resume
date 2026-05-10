// lib/sse.ts
export type ServerEvent =
  | { type: "token"; text: string }
  | { type: "citation"; n: number; chunk: unknown }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "rate_limited"; retryAfterSeconds: number }
  | { type: "spend_capped"; message: string };

export function encodeSse(event: ServerEvent): Uint8Array {
  const json = JSON.stringify(event);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

export function makeSseStream(): {
  stream: ReadableStream<Uint8Array>;
  send: (event: ServerEvent) => void;
  close: () => void;
} {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });
  return {
    stream,
    send(event) {
      try {
        controller.enqueue(encodeSse(event));
      } catch {
        // stream already closed (e.g. client disconnect)
      }
    },
    close() {
      controller.close();
    },
  };
}
