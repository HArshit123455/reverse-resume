import type { ExperienceFrontmatterT } from "@/lib/content/experience";
import { isCurrent } from "@/lib/content/experience";
import { LogoTile } from "./logo-tile";

function periodOf(dates?: string): string {
  if (!dates) return "";
  return dates.replace(/\s*(to|-|–)\s*/i, " — ");
}

export function LogoTimeline({ items }: { items: ExperienceFrontmatterT[] }) {
  return (
    <div className="border-t border-border">
      {items.map((e, i) => {
        const now = isCurrent(e.dates);
        return (
          <div
            key={`${e.employer}-${e.role}-${i}`}
            className={`tl-item group grid grid-cols-[64px_minmax(0,1fr)] gap-[26px] border-b border-border py-8 max-[560px]:grid-cols-[48px_minmax(0,1fr)] max-[560px]:gap-[18px] max-[560px]:py-[26px] ${
              now ? "tl-item--now" : ""
            }`}
          >
            <div className="tl-rail">
              <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                <LogoTile name={e.employer} logo={e.logo} />
              </div>
            </div>

            <div>
              <div className="mb-[9px] flex items-center gap-2.5">
                {e.kind ? (
                  <span className="rounded-[5px] bg-accent-soft px-[9px] py-1 font-mono text-[9.5px] uppercase tracking-[0.10em] text-accent">
                    {e.kind}
                  </span>
                ) : null}
                <span className="h-[3px] w-[3px] rounded-full bg-muted-2" aria-hidden />
                <span className="font-mono text-[12px] text-muted">{periodOf(e.dates)}</span>
                {now ? (
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.10em] text-accent">
                    <span className="about-dot-sm" aria-hidden />
                    Currently
                  </span>
                ) : null}
              </div>

              <h3 className="mb-1 font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.018em] text-fg">
                {e.role}
              </h3>
              <div className="mb-[13px] text-[15px] text-fg-soft">
                <b className="font-semibold">{e.employer}</b>
                {e.location ? <span className="mx-[7px] text-muted-2">·</span> : null}
                {e.location ? <span className="text-muted">{e.location}</span> : null}
              </div>

              {e.summary ? (
                <p className="mb-4 max-w-[58ch] text-pretty text-[14.5px] leading-[1.65] text-muted">
                  {e.summary}
                </p>
              ) : null}

              {e.stack.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.stack.map((s, si) => (
                    <span
                      key={`${s}-${si}`}
                      className="rounded-[4px] bg-bg-sunk px-2 py-0.5 font-mono text-[11px] text-fg-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
