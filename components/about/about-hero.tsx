import type { AboutFrontmatterT } from "@/lib/content/about";
import { Icon } from "./icons";

function renderLede(lede: string) {
  return lede.split("*").map((seg, i) =>
    i % 2 === 1 ? (
      <em key={i} className="font-medium not-italic text-accent">
        {seg}
      </em>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

export function AboutHero({ data }: { data: AboutFrontmatterT }) {
  return (
    <section className="pb-[18px] pt-[64px] sm:pt-[92px]">
      {/* eyebrow + availability */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
          <span className="about-dot" aria-hidden />
          About
        </span>
        {data.availability ? (
          <span className="inline-flex items-center gap-2 rounded-pill border border-[color-mix(in_oklab,var(--accent)_22%,transparent)] bg-accent-soft px-[9px] py-1 pr-[11px] font-mono text-[10.5px] text-accent">
            <span className="about-dot-sm" aria-hidden />
            {data.availability}
          </span>
        ) : null}
      </div>

      {/* name */}
      <h1 className="mb-9 mt-4 font-serif text-[clamp(56px,9vw,104px)] font-medium leading-[0.94] tracking-[-0.032em] text-fg">
        {data.name}
      </h1>

      {/* two-column lede / aside */}
      <div className="grid items-end gap-14 max-[760px]:grid-cols-1 max-[760px]:items-start max-[760px]:gap-7 min-[761px]:grid-cols-[1.05fr_0.95fr]">
        <p className="text-balance font-serif text-[clamp(28px,3.4vw,42px)] font-medium leading-[1.16] tracking-[-0.016em] text-fg">
          {renderLede(data.lede)}
        </p>
        <div className="flex flex-col gap-5 pb-1.5">
          <div className="flex flex-wrap gap-x-2.5 gap-y-2">
            <MetaChip icon="pin" label={data.location} />
            <MetaChip icon="briefcase" label="Software Developer @ Zykrr" />
            <MetaChip icon="code" label="TypeScript, end-to-end" />
          </div>
          <p className="text-pretty text-[16px] leading-[1.65] text-muted">{data.support}</p>
        </div>
      </div>

      {/* stat strip */}
      <div className="mt-[34px] flex flex-wrap border-y border-border">
        {data.stats.map((s) => (
          <div
            key={s.cap}
            className="stat min-w-[130px] flex-1 py-5 pr-6 [&:not(:first-child)]:pl-6 max-[560px]:basis-1/2"
          >
            <div className="font-serif text-[42px] font-medium leading-none tracking-[-0.02em] text-fg">
              {s.num}
              {s.unit ? <span className="ml-1 align-baseline text-[18px] text-accent">{s.unit}</span> : null}
            </div>
            <div className="mt-[9px] max-w-[18ch] text-[12.5px] leading-[1.4] text-muted">{s.cap}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetaChip({ icon, label }: { icon: "pin" | "briefcase" | "code"; label: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-pill border border-border bg-bg-elev px-[13px] py-[7px] text-[13px] text-fg-soft">
      <Icon name={icon} className="h-[15px] w-[15px] text-accent" />
      {label}
    </span>
  );
}
