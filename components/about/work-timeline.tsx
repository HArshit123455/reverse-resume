import type { ExperienceFrontmatterT } from "@/lib/content/experience";

export function WorkTimeline({ items }: { items: ExperienceFrontmatterT[] }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        Where I&apos;ve worked
      </h2>
      <ol className="space-y-3 border-l border-border pl-5">
        {items.map((e, i) => (
          <li key={`${e.employer}-${e.role}-${e.dates ?? i}`} className="relative rounded-[12px] border border-border bg-bg-elev p-4">
            <span className="absolute -left-[27px] top-5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-[15px] font-semibold text-fg">{e.role}</h3>
              <span className="font-mono text-[11px] text-muted-2">{e.dates}</span>
            </div>
            <div className="mt-0.5 text-[13.5px] text-fg-soft">
              {e.employer}
              {e.location ? <span className="text-muted"> · {e.location}</span> : null}
            </div>
            {e.stack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.stack.map((s, si) => (
                  <span key={`${s}-${si}`} className="rounded-full bg-bg-sunk px-2 py-0.5 font-mono text-[11px] text-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
