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
      <header className="max-w-3xl space-y-3">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-text md:text-5xl">
          {landing.headline}
        </h1>
        <p className="text-[15px] leading-relaxed text-text-soft md:text-base">
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
