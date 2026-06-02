import type { AboutFrontmatterT } from "@/lib/content/about";

export function SkillGroups({ skills }: { skills: AboutFrontmatterT["skills"] }) {
  return (
    <section>
      <h2 className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-2">
        What I work with
      </h2>
      <div className="space-y-3">
        {skills.map((g) => (
          <div key={g.group} className="rounded-[12px] border border-border bg-bg-elev p-4">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{g.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((it) => (
                <span key={it} className="rounded-full bg-bg-sunk px-2.5 py-1 text-[12.5px] text-fg-soft">
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
