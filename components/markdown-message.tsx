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
      className="prose prose-neutral prose-sm max-w-none dark:prose-invert
                 prose-p:my-3 prose-pre:my-3 prose-pre:bg-transparent prose-pre:p-0
                 prose-headings:font-serif prose-headings:tracking-tight
                 prose-strong:text-text prose-strong:font-semibold
                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                 prose-code:rounded prose-code:bg-code-bg prose-code:px-1.5 prose-code:py-0.5
                 prose-code:text-[0.92em] prose-code:font-normal prose-code:text-text
                 prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{transformCitations(children)}</p>,
          li: ({ children }) => <li>{transformCitations(children)}</li>,
          code: (props) => {
            const { inline, className, children, ...rest } = props as {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            } & Record<string, unknown>;
            if (inline) {
              return <code className={className} {...rest}>{children}</code>;
            }
            const lang = className?.replace("language-", "");
            return <ShikiCode code={String(children).replace(/\n$/, "")} language={lang} />;
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
