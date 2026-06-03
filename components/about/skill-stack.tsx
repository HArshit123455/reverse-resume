import type { AboutFrontmatterT } from "@/lib/content/about";

export function SkillStack({ skills }: { skills: AboutFrontmatterT["skills"] }) {
  return (
    <div className="flex flex-col gap-3">
      {skills.map((g) => (
        <div key={g.group} className="rounded-[16px] border border-border bg-bg-elev px-6 pb-6 pt-[22px]">
          <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
            {g.group}
          </div>
          <div className="flex flex-wrap gap-2">
            {g.items.map((it, i) => (
              <span
                key={`${it}-${i}`}
                className="inline-flex rounded-pill border border-transparent bg-bg-sunk px-[15px] py-2 text-[14px] text-fg-soft transition-colors hover:border-border-strong hover:text-fg"
              >
                {it}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
