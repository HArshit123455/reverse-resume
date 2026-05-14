"use client";

import { useEffect, useState } from "react";

interface ShikiCodeProps {
  code: string;
  language?: string;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function ShikiCode({ code, language }: ShikiCodeProps) {
  const isDark = useIsDark();
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const result = await codeToHtml(code, {
          lang: language ?? "text",
          theme: isDark ? "github-dark" : "github-light",
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, language, isDark]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore (clipboard unavailable)
    }
  }

  return (
    <div
      className="group relative my-3 overflow-hidden rounded-lg border border-border bg-code-bg"
      role="region"
      aria-label={`Code excerpt${language ? `, ${language}` : ""}`}
    >
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-soft opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {html ? (
        <div
          className="overflow-x-auto p-4 text-[13px] leading-relaxed [&_pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
