"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShikiCode } from "./shiki-code";
import { transformCitations } from "./transform-citations";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <article
      aria-label="Assistant answer"
      className="prose max-w-none dark:prose-invert
                 prose-p:my-4 prose-p:text-[18px] prose-p:leading-[1.6] prose-p:text-fg-soft
                 prose-li:text-[18px] prose-li:leading-[1.6] prose-li:text-fg-soft prose-li:marker:text-muted-2
                 prose-pre:my-4 prose-pre:bg-transparent prose-pre:p-0
                 prose-headings:font-bold prose-headings:tracking-[-0.025em] prose-headings:text-fg
                 prose-strong:text-fg prose-strong:font-semibold
                 prose-a:text-fg prose-a:underline prose-a:decoration-border-strong prose-a:underline-offset-4 hover:prose-a:decoration-fg
                 prose-blockquote:border-l-0 prose-blockquote:pl-0 prose-blockquote:font-semibold prose-blockquote:not-italic prose-blockquote:text-fg
                 prose-code:rounded-md prose-code:bg-bg-elev prose-code:px-1.5 prose-code:py-0.5
                 prose-code:text-[0.86em] prose-code:font-normal prose-code:text-fg
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{transformCitations(children)}</p>,
          li: ({ children }) => <li>{transformCitations(children)}</li>,
          // react-markdown v9 has no `inline` flag: fenced blocks arrive as <pre><code>,
          // so the block renderer lives on `pre` and `code` stays inline.
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children;
            const props = (child as { props?: { className?: string; children?: React.ReactNode } })?.props ?? {};
            const lang = props.className?.replace("language-", "");
            return <ShikiCode code={String(props.children ?? "").replace(/\n$/, "")} language={lang} />;
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
