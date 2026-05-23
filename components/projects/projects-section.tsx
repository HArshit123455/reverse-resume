import { loadProjects } from "@/lib/content/projects";
import { CommitGraph } from "./commit-graph";
import { ProjectsGrid } from "./projects-grid";

export function ProjectsSection() {
  const projects = loadProjects();
  return (
    <section
      id="work"
      data-section="projects"
      className="scroll-mt-20 space-y-6 pt-12"
    >
      <header className="space-y-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
          Work
        </div>
        <h2 className="font-serif text-[32px] italic leading-tight tracking-[-0.01em] text-fg">
          Projects & production
        </h2>
        <p className="max-w-[60ch] text-[14px] text-fg-soft">
          A small selection. Each card links to source where public; ask the chat above
          for the deep version of any one of them.
        </p>
      </header>

      <CommitGraph />
      <ProjectsGrid projects={projects} />
    </section>
  );
}
