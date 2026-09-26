import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChatShell, type SuggestionChipsByAudience } from "@/components/chat-shell";
import { ProjectsSection } from "@/components/projects/projects-section";
import { CommitGraph } from "@/components/projects/commit-graph";
import { StageReveal } from "@/components/ui/stage-reveal";
import { Icon } from "@/components/ui/icon";
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

function CloseStage() {
  return (
    <section aria-labelledby="close-heading" className="px-5 pb-28 sm:px-8 sm:pb-40">
      <StageReveal className="mx-auto max-w-[1120px] text-center">
        <h2
          id="close-heading"
          className="text-[clamp(44px,7.4vw,84px)] font-bold leading-[1] tracking-[-0.04em] text-fg [font-stretch:104%]"
        >
          Let&apos;s talk.
        </h2>
        <p className="mx-auto mt-6 max-w-[36ch] text-[clamp(19px,2vw,23px)] font-medium leading-[1.35] tracking-[-0.018em] text-muted">
          Backend-heavy full-stack developer in New Delhi, open to opportunities.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:harshitsindhu10@gmail.com"
            className="inline-flex h-12 items-center gap-2 rounded-pill bg-fg px-6 text-[16px] font-medium text-bg transition-transform duration-300 ease-stage hover:scale-[1.02]"
          >
            <Icon name="mail" className="h-[18px] w-[18px]" />
            Email me
          </a>
          <a
            href="/resume.pdf"
            download
            className="inline-flex h-12 items-center gap-2 rounded-pill px-6 text-[16px] font-medium text-fg ring-1 ring-inset ring-border-strong transition-colors hover:ring-fg"
          >
            <Icon name="download" className="h-[18px] w-[18px]" />
            Résumé (PDF)
          </a>
        </div>
        <ul className="mt-8 flex justify-center gap-2" aria-label="Profiles">
          {(
            [
              ["github", "GitHub", "https://github.com/HArshit123455"],
              ["linkedin", "LinkedIn", "https://www.linkedin.com/in/harshit-sindhu/"],
              ["gitlab", "GitLab", "https://gitlab.com/harshit_sindhu"],
            ] as const
          ).map(([icon, label, href]) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-fg-soft transition-colors hover:bg-bg-elev hover:text-fg"
              >
                <Icon name={icon} className="h-5 w-5" />
              </a>
            </li>
          ))}
        </ul>
      </StageReveal>
    </section>
  );
}

export default function Home() {
  const landing = loadLanding();
  return (
    <>
      <main>
        <ChatShell subheadline={landing.subheadline} suggestionChips={landing.suggestionChips} />
        <ProjectsSection />
        <CommitGraph />
        <CloseStage />
      </main>
      <Footer />
    </>
  );
}
