"use client";

import { useEffect, useState } from "react";

interface ShikiCodeProps {
  code: string;
  language?: string;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
  );
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.getAttribute("data-theme") === "dark");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Highlighted HTML by theme + language + code. While an answer streams, a code block's
// text grows token by token; the cache means a re-render never drops back to the plain
// fallback, and re-visited blocks paint highlighted immediately.
const HIGHLIGHT_CACHE = new Map<string, string>();
const cacheKey = (code: string, language: string | undefined, dark: boolean) =>
  `${dark ? "d" : "l"}|${language ?? "text"}|${code}`;

export function ShikiCode({ code, language }: ShikiCodeProps) {
  const isDark = useIsDark();
  const [html, setHtml] = useState<string>(() => HIGHLIGHT_CACHE.get(cacheKey(code, language, isDark)) ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const key = cacheKey(code, language, isDark);
        const cached = HIGHLIGHT_CACHE.get(key);
        const result =
          cached ??
          (await codeToHtml(code, {
            lang: language ?? "text",
            theme: isDark ? "github-dark" : "github-light",
          }));
        if (!cached) {
          if (HIGHLIGHT_CACHE.size > 200) HIGHLIGHT_CACHE.clear();
          HIGHLIGHT_CACHE.set(key, result);
        }
        if (!cancelled) setHtml(result);
      } catch {
        // unknown language etc.: keep whatever is on screen rather than flashing the fallback
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
      className="group relative my-3 overflow-hidden rounded-[14px] bg-bg-elev"
      role="region"
      aria-label={`Code excerpt${language ? `, ${language}` : ""}`}
    >
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-pill bg-bg px-2.5 py-1 text-[12px] text-fg-soft opacity-0 ring-1 ring-border transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {html ? (
        <div
          className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed [&_code]:font-mono [&_pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
