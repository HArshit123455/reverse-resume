"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BioProse({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-fg-soft">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
