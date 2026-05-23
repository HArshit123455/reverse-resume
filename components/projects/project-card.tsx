import type { ProjectFrontmatterT } from "@/lib/content/projects";

interface ProjectCardProps {
  project: ProjectFrontmatterT;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article
      data-project-card
      data-slug={project.slug}
      className="flex flex-col gap-3 rounded-[12px] border border-border bg-bg-elev p-5 transition-colors hover:border-border-strong"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
            {project.kind}
          </span>
          {project.status === "archived" && (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
              archived
            </span>
          )}
        </div>
        <span className="font-mono text-[10.5px] text-muted-2">{project.year}</span>
      </header>

      <h3 className="font-serif text-[20px] italic leading-tight tracking-[-0.01em] text-fg">
        {project.title}
      </h3>

      <p className="text-[13.5px] leading-relaxed text-fg-soft">{project.description}</p>

      {project.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-pill border border-border bg-bg-sunk px-2 py-0.5 font-mono text-[10.5px] text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {project.stats.length > 0 && (
        <dl className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3">
          {project.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
                {stat.label}
              </dt>
              <dd className="font-serif text-[17px] italic text-fg">{stat.val}</dd>
            </div>
          ))}
        </dl>
      )}

      {project.url && (
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 self-start text-[12.5px] text-accent transition-opacity hover:opacity-80"
        >
          View source →
        </a>
      )}
    </article>
  );
}
