import type { ProjectFrontmatterT } from "@/lib/content/projects";
import { ProjectCard } from "./project-card";

interface ProjectsGridProps {
  projects: ProjectFrontmatterT[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted">No projects yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {projects.map((p) => (
        <ProjectCard key={p.slug} project={p} />
      ))}
    </div>
  );
}
