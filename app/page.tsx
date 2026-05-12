import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell } from "@/components/chat-shell";

interface LandingFront { headline: string; subheadline: string; demoPrompts: string[] }

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{landing.headline}</h1>
        <p className="text-neutral-600">{landing.subheadline}</p>
      </header>
      <ChatShell demoPrompts={landing.demoPrompts} />
      <footer className="text-xs text-neutral-500 pt-8 border-t">
        Built by{" "}
        <a className="underline" href="mailto:harshitsindhu10@gmail.com">Harshit Sindhu</a>
        {" • "}
        <a className="underline" href="https://www.linkedin.com/in/harshit-sindhu/" target="_blank" rel="noreferrer">LinkedIn</a>
        {" • "}
        <a className="underline" href="https://github.com/HArshit123455" target="_blank" rel="noreferrer">GitHub</a>
        {" • "}
        <a className="underline" href="https://leetcode.com/u/Harry_S/" target="_blank" rel="noreferrer">LeetCode</a>
      </footer>
    </main>
  );
}
