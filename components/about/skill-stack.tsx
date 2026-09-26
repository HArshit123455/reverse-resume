import type { AboutFrontmatterT } from "@/lib/content/about";

/** A spec sheet: the group on the left, the tools as one readable line on the right. */
export function SkillStack({ skills }: { skills: AboutFrontmatterT["skills"] }) {
  return (
    <dl className="border-b border-border">
      {skills.map((g) => (
        <div
          key={g.group}
          className="grid gap-2 border-t border-border py-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8 sm:py-7"
        >
          <dt className="text-[15px] text-muted sm:pt-1.5">{g.group}</dt>
          <dd className="text-[clamp(20px,2.2vw,24px)] font-semibold leading-[1.35] tracking-[-0.022em] text-fg">
            {g.items.join(", ")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
