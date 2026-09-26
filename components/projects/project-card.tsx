import Link from "next/link";
import type { ProjectFrontmatterT } from "@/lib/content/projects";
import { Icon } from "../ui/icon";
import { StageReveal } from "../ui/stage-reveal";

interface ProjectCardProps {
  project: ProjectFrontmatterT;
  /** the flagship gets the stage to itself */
  featured?: boolean;
}

const LINK_CLASS =
  "inline-flex items-center gap-1 text-[16px] font-medium text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-fg";

/** Off-site source opens in a new tab; a site path (an in-site story) stays in the tab. */
function SourceLink({ url, label }: { url: string; label?: string }) {
  if (url.startsWith("/")) {
    return (
      <Link href={url} className={LINK_CLASS}>
        {label ?? "Read more"}
        <Icon name="arrow-right" className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
      {label ?? "View source"}
      <Icon name="arrow-up-right" className="h-4 w-4" />
    </a>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <p className="font-mono text-[12.5px] leading-relaxed text-muted">
      <span className="sr-only">Built with: </span>
      {tags.join("  ·  ")}
    </p>
  );
}

/**
 * Proof, not a claim: a real answer the site gave (captured from one live call),
 * with its numbered footnotes. The frame shows the top; the full image is a click away.
 */
function AnswerProof() {
  return (
    <StageReveal delay={120} className="lg:col-span-6">
      <figure>
        <a
          href="/reverse-resume/answer-light.png"
          target="_blank"
          rel="noreferrer"
          aria-label="Open the full answer image"
          className="block h-[520px] overflow-hidden rounded-tile bg-bg-elev ring-1 ring-inset ring-border sm:h-[600px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/reverse-resume/answer-light.png"
            alt="A real answer from this site to “Show me how you built production rate limiting”: a Postgres token bucket in one INSERT … ON CONFLICT statement, with code, numbered citation markers and a Sources list"
            width={1712}
            height={2954}
            loading="lazy"
            className="w-full dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/reverse-resume/answer-dark.png"
            alt="A real answer from this site to “Show me how you built production rate limiting”: a Postgres token bucket in one INSERT … ON CONFLICT statement, with code, numbered citation markers and a Sources list"
            width={1712}
            height={2954}
            loading="lazy"
            className="hidden w-full dark:block"
          />
        </a>
        <figcaption className="mt-4 text-[14px] leading-snug text-muted">
          A real answer, captured on 26 September 2026. The numbers link each claim to its source.
        </figcaption>
      </figure>
    </StageReveal>
  );
}

/** One project as one slide-width row: name and facts left, the story right. */
export function ProjectCard({ project, featured }: ProjectCardProps) {
  const meta = `${project.kind} · ${project.year}${project.status === "archived" ? " · Archived" : ""}`;

  if (featured) {
    return (
      <article data-project-card data-slug={project.slug} className="border-t border-border py-14 sm:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
        <StageReveal className="lg:col-span-6">
          <h3 className="text-[clamp(40px,6vw,72px)] font-bold leading-[1] tracking-[-0.04em] text-fg [font-stretch:104%]">
            {project.title}
          </h3>
          <p className="mt-4 text-[15px] text-muted">{meta}</p>
          <p className="mt-7 max-w-[40ch] text-[clamp(21px,2.4vw,28px)] font-semibold leading-[1.28] tracking-[-0.022em] text-muted">
            {project.description}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href="#top"
              className="inline-flex h-12 items-center gap-2 rounded-pill bg-fg px-6 text-[16px] font-medium text-bg transition-transform duration-300 ease-stage hover:scale-[1.02]"
            >
              You&apos;re using it. Ask it something
              <Icon name="arrow-up" className="h-4 w-4" />
            </a>
            {project.url && <SourceLink url={project.url} label={project.urlLabel} />}
          </div>
          <div className="mt-9">
            <Tags tags={project.tags} />
          </div>
        </StageReveal>
        {project.slug === "reverse-resume" ? <AnswerProof /> : null}
        </div>
      </article>
    );
  }

  return (
    <article data-project-card data-slug={project.slug} className="border-t border-border py-12 sm:py-16">
      <StageReveal className="grid gap-6 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-5">
          {project.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.icon}
              alt=""
              width={64}
              height={64}
              className="mb-5 h-14 w-14 rounded-[22%] sm:h-16 sm:w-16"
            />
          ) : null}
          <h3 className="text-[clamp(26px,2.8vw,34px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
            {project.title}
          </h3>
          <p className="mt-3 text-[15px] text-muted">{meta}</p>
        </div>
        <div className="space-y-6 md:col-span-7">
          <p className="max-w-[58ch] text-[19px] leading-[1.55] tracking-[-0.014em] text-fg-soft">
            {project.description}
          </p>
          <Tags tags={project.tags} />
          {project.url && <SourceLink url={project.url} label={project.urlLabel} />}
        </div>
      </StageReveal>
    </article>
  );
}
