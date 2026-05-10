// components/code-block.tsx
"use client";

import { useEffect, useState } from "react";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const result = await codeToHtml(code, { lang: language ?? "text", theme: "github-light" });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml("");
      }
    })();
    return () => { cancelled = true; };
  }, [code, language]);

  return html
    ? <div className="text-xs overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
    : <pre className="text-xs overflow-x-auto bg-neutral-50 p-2 rounded"><code>{code}</code></pre>;
}
