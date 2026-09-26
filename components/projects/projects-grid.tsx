import type { ProjectFrontmatterT } from "@/lib/content/projects";
import { ProjectCard } from "./project-card";

interface ProjectsGridProps {
  projects: ProjectFrontmatterT[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return <p className="text-[17px] text-muted">No projects yet.</p>;
  }
  return (
    <div className="border-b border-border">
      {projects.map((p, i) => (
        <ProjectCard key={p.slug} project={p} featured={i === 0} />
      ))}
    </div>
  );
}
