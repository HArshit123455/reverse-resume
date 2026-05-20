import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/30 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-6">
        <Link href="/" className="group inline-flex items-baseline gap-0 leading-none" aria-label="Harshit Sindhu — home">
          <span className="font-serif text-2xl font-medium italic tracking-tight text-fg">
            harshit
          </span>
          <span
            aria-hidden
            className="ml-[3px] inline-block h-1.5 w-1.5 translate-y-0.5 rounded-full bg-accent"
          />
          <small className="ml-3.5 border-l border-border pl-3.5 font-sans text-xs font-normal not-italic text-muted">
            Full-stack engineer
          </small>
        </Link>
        <div className="flex items-center gap-1">
          <a
            href="https://www.linkedin.com/in/harshit-sindhu/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
          </a>
          <a
            href="https://github.com/HArshit123455"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 0 0-.9-2.1c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.8 0 0-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.1 1.6 4 2 4 2c-.8 2-.3 3.5-.1 3.8A5.1 5.1 0 0 0 2.5 9.3c0 5 3.1 6.3 6 6.6-.4.4-.7.9-.8 1.5L8 22"/>
            </svg>
          </a>
          <a
            href="https://gitlab.com/harshit_sindhu"
            target="_blank"
            rel="noreferrer"
            aria-label="GitLab profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-bg-sunk hover:text-fg transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M22.65 14.39 12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.5h8.1l2.44-7.5A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
            </svg>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
