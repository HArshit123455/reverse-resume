import type { ExperienceFrontmatterT } from "@/lib/content/experience";
import { isCurrent } from "@/lib/content/experience";
import { LogoTile } from "./logo-tile";

function periodOf(dates?: string): string {
  if (!dates) return "";
  return dates.replace(/\s*(to|-|–)\s*/i, " – ").replace(/present/i, "Present");
}

export function LogoTimeline({ items }: { items: ExperienceFrontmatterT[] }) {
  return (
    <ol className="border-b border-border">
      {items.map((e, i) => {
        const now = isCurrent(e.dates);
        return (
          <li
            key={`${e.employer}-${e.role}-${i}`}
            className="grid grid-cols-[56px_minmax(0,1fr)] gap-5 border-t border-border py-10 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-8 sm:py-12"
          >
            <LogoTile name={e.employer} logo={e.logo} />
            <div className="grid gap-6 md:grid-cols-12">
              <div className="md:col-span-5">
                <h3 className="text-[clamp(24px,2.6vw,30px)] font-bold leading-[1.1] tracking-[-0.03em] text-fg">
                  {e.role}
                </h3>
                <p className="mt-2 text-[17px] text-fg-soft">
                  {e.employer}
                  {e.location ? <span className="text-muted"> · {e.location}</span> : null}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[15px] text-muted">
                  <span className="tabular">{periodOf(e.dates)}</span>
                  {e.kind ? <span>· {e.kind}</span> : null}
                  {now ? (
                    <span className="inline-flex items-center gap-2 font-medium text-fg">
                      <span className="live-dot" aria-hidden />
                      Currently
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="md:col-span-7">
                {e.summary ? (
                  <p className="max-w-[58ch] text-[17px] leading-[1.6] text-fg-soft">{e.summary}</p>
                ) : null}
                {e.stack.length > 0 ? (
                  <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-muted">
                    <span className="sr-only">Stack: </span>
                    {e.stack.join("  ·  ")}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
