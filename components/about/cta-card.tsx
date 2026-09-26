import Link from "next/link";
import type { AboutFrontmatterT } from "@/lib/content/about";
import { Icon } from "../ui/icon";

export function CtaCard({ data }: { data: AboutFrontmatterT }) {
  return (
    <section
      aria-label="Contact and résumé"
      className="py-10 text-center"
    >
      <h2 className="text-[clamp(38px,5.6vw,64px)] font-bold leading-[1.02] tracking-[-0.04em] text-fg">
        Let&apos;s talk.
      </h2>
      <p className="mx-auto mt-6 max-w-[36ch] text-[clamp(19px,2vw,23px)] font-medium leading-[1.35] tracking-[-0.018em] text-muted">
        Backend-heavy full-stack developer in New Delhi, open to opportunities.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a
          href={data.resumeUrl}
          download
          className="inline-flex h-12 items-center gap-2 rounded-pill bg-fg px-6 text-[16px] font-medium text-bg transition-transform duration-300 ease-stage hover:scale-[1.02]"
        >
          <Icon name="download" className="h-[18px] w-[18px]" />
          Download résumé (PDF)
        </a>
        <Link
          href="/"
          className="inline-flex h-12 items-center gap-2 rounded-pill px-6 text-[16px] font-medium text-fg ring-1 ring-inset ring-border-strong transition-colors hover:ring-fg"
        >
          Ask my work anything
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
      <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[15px]">
        {data.links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-fg-soft underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
