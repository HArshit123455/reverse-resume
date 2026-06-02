import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell, type SuggestionChipsByAudience } from "@/components/chat-shell";
import { ProjectsSection } from "@/components/projects/projects-section";
import { NowStrip } from "@/components/now/now-strip";
import { Footer } from "@/components/footer";

export const revalidate = 21600; // 6h — ISR for the embedded GitLab activity graph

interface LandingFront {
  headline: string;
  subheadline: string;
  suggestionChips: SuggestionChipsByAudience;
}

function loadLanding(): LandingFront {
  const raw = readFileSync(join(process.cwd(), "content/landing.mdx"), "utf-8");
  return matter(raw).data as LandingFront;
}

export default function Home() {
  const landing = loadLanding();
  return (
    <main className="space-y-10">
      <ChatShell subheadline={landing.subheadline} suggestionChips={landing.suggestionChips} />
      <ProjectsSection />
      <NowStrip />
      <Footer />
    </main>
  );
}
