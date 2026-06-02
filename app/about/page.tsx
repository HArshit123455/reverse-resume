import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { loadAbout } from "@/lib/content/about";
import { loadExperience } from "@/lib/content/experience";
import { BioProse } from "@/components/about/bio-prose";
import { WorkTimeline } from "@/components/about/work-timeline";
import { SkillGroups } from "@/components/about/skill-groups";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "About — Harshit Sindhu",
  description: "Backend-heavy full-stack developer. Where I've worked, what I build, and how to reach me.",
};

export default function AboutPage() {
  const { data, body } = loadAbout();
  const experience = loadExperience();

  return (
    <div className="mx-auto max-w-[640px] space-y-10">
      <header className="space-y-3">
        {data.photo && (
          <Image
            src={data.photo}
            alt={data.name}
            width={88}
            height={88}
            className="rounded-full border border-border object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-fg">{data.name}</h1>
          <p className="mt-1 text-[15px] text-muted">{data.tagline}</p>
        </div>
      </header>

      <BioProse content={body} />

      <WorkTimeline items={experience} />

      <SkillGroups skills={data.skills} />

      {data.achievements.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">Achievements</h2>
          <ul className="space-y-2">
            {data.achievements.map((a) => (
              <li key={a} className="flex gap-2 text-[14px] text-fg-soft">
                <span className="text-accent" aria-hidden>▹</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[12px] border border-border bg-bg-elev p-5">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={data.resumeUrl}
            className="inline-flex items-center rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
          >
            Download résumé (PDF)
          </a>
          {data.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-[14px] text-muted hover:text-fg transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <p className="mt-3 text-[13.5px] text-muted">
          Prefer to dig in?{" "}
          <Link href="/" className="text-accent hover:underline">
            Ask my work anything →
          </Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
