import { loadSelectedProjects } from "@/lib/content/projects";
import { StageReveal } from "../ui/stage-reveal";
import { ProjectsGrid } from "./projects-grid";

export function ProjectsSection() {
  const projects = loadSelectedProjects();
  return (
    <section
      id="work"
      data-section="projects"
      aria-labelledby="work-heading"
      className="scroll-mt-12 px-5 py-24 sm:px-8 sm:py-36"
    >
      <div className="mx-auto max-w-[1120px]">
        <StageReveal className="mb-14 max-w-[820px] sm:mb-20">
          <h2
            id="work-heading"
            className="text-[clamp(44px,7.4vw,84px)] font-bold leading-[1] tracking-[-0.04em] text-fg [font-stretch:104%]"
          >
            Selected work.
          </h2>
          <p className="mt-6 max-w-[40ch] text-[clamp(19px,2vw,23px)] font-medium leading-[1.35] tracking-[-0.018em] text-muted">
            Each links to source where it&apos;s public. Ask the chat above for the deep version of any
            of them.
          </p>
        </StageReveal>
        <ProjectsGrid projects={projects} />
      </div>
    </section>
  );
}
