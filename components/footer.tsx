import { FooterCmdKTrigger } from "./palette/footer-cmd-k-trigger";

export function Footer() {
  return (
    <footer
      id="footer"
      className="mt-20 grid scroll-mt-20 gap-6 border-t border-border pt-[52px] pb-11 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="font-mono text-[11.5px] tracking-[0.02em] text-muted">
        © {new Date().getFullYear()} Harshit Sindhu · Built in TypeScript, deployed on a Tuesday ·{" "}
        <FooterCmdKTrigger /> for the good stuff
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href="mailto:harshitsindhu10@gmail.com"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          Email
        </a>
        <a
          href="https://www.linkedin.com/in/harshit-sindhu/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66h-3.55V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
          </svg>
          LinkedIn
        </a>
        <a
          href="https://github.com/HArshit123455"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5a3 3 0 0 0-.9-2.1c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5c.1-.3.6-1.8-.1-3.8 0 0-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C5.1 1.6 4 2 4 2c-.8 2-.3 3.5-.1 3.8A5.1 5.1 0 0 0 2.5 9.3c0 5 3.1 6.3 6 6.6-.4.4-.7.9-.8 1.5L8 22" />
          </svg>
          GitHub
        </a>
        <a
          href="https://gitlab.com/harshit_sindhu"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22.65 14.39 12 22.13 1.35 14.39a.84.84 0 0 1-.31-.94l1.22-3.78 2.43-7.5A.42.42 0 0 1 4.96 2a.43.43 0 0 1 .41.34L7.8 10.07h8.4l2.43-7.5A.42.42 0 0 1 19.04 2a.43.43 0 0 1 .41.34l2.43 7.5L23.1 13.62a.84.84 0 0 1-.31.94z" />
          </svg>
          GitLab
        </a>
        <a
          href="https://leetcode.com/u/Harry_S/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill border border-border px-3.5 py-2 text-[13px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
        >
          LeetCode
        </a>
      </div>
    </footer>
  );
}
