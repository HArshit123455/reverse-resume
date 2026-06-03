import Link from "next/link";
import type { AboutFrontmatterT } from "@/lib/content/about";
import { Icon } from "./icons";

export function CtaCard({ data }: { data: AboutFrontmatterT }) {
  return (
    <section
      aria-label="Contact and résumé"
      className="mt-7 rounded-[16px] border border-border bg-bg-elev p-8 shadow-md"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <a
          href={data.resumeUrl}
          download
          className="inline-flex h-[52px] items-center gap-2 rounded-[12px] bg-accent px-[26px] text-[15px] font-semibold text-accent-ink transition-transform hover:-translate-y-px hover:brightness-[1.04]"
        >
          <Icon name="file" className="h-[18px] w-[18px]" />
          Download résumé (PDF)
        </a>
        <div className="flex flex-wrap gap-x-[22px] gap-y-1.5">
          {data.links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-[14.5px] text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
      <p className="mt-[22px] border-t border-border pt-5 text-[15px] text-muted">
        Prefer to dig in?{" "}
        <Link href="/" className="group text-accent">
          Ask my work anything{" "}
          <span className="inline-block transition-transform group-hover:translate-x-[3px]">→</span>
        </Link>
      </p>
    </section>
  );
}
