import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell } from "@/components/chat-shell";

interface LandingFront {
  headline: string;
  subheadline: string;
  demoPrompts: string[];
}

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-10">
      {/* NOTE: eyebrow copy is the design-mock placeholder; user confirms/rewrites in Phase 5b content authoring. */}
      <header className="max-w-3xl space-y-7">
        <div className="inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
          <span aria-hidden className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent ring-4 ring-accent-soft animate-[pulse-dot_2.6s_ease-in-out_infinite]" />
          Open to senior/mid full-stack roles · Delhi / Remote
        </div>
        <h1 className="font-serif text-[clamp(48px,8vw,96px)] font-medium leading-[0.94] tracking-[-0.03em] text-fg">
          Ask my work <em className="not-italic font-medium text-accent italic">anything</em>.
        </h1>
        <p className="max-w-[580px] text-[17px] leading-[1.6] text-muted">
          {landing.subheadline}
        </p>
      </header>
      <ChatShell demoPrompts={landing.demoPrompts} />
      <footer className="border-t border-border pt-6 text-xs text-muted">
        Built by{" "}
        <a className="text-text-soft hover:text-accent" href="mailto:harshitsindhu10@gmail.com">
          Harshit Sindhu
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://www.linkedin.com/in/harshit-sindhu/" target="_blank" rel="noreferrer">
          LinkedIn
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://github.com/HArshit123455" target="_blank" rel="noreferrer">
          GitHub
        </a>{" "}
        ·{" "}
        <a className="text-text-soft hover:text-accent" href="https://leetcode.com/u/Harry_S/" target="_blank" rel="noreferrer">
          LeetCode
        </a>
      </footer>
    </main>
  );
}
