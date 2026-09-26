import type { AboutFrontmatterT } from "@/lib/content/about";

/** Keynote emphasis: the sentence sits in grey, the *marked* words step forward in full ink. */
function renderLede(lede: string) {
  return lede.split("*").map((seg, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-fg">
        {seg}
      </span>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

export function AboutHero({ data }: { data: AboutFrontmatterT }) {
  return (
    <section className="px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
      <div className="mx-auto max-w-[1120px]">
        <h1 className="stage-in text-[clamp(56px,11vw,96px)] font-bold leading-[0.95] tracking-[-0.045em] text-fg [font-stretch:104%]">
          {data.name}
        </h1>
        <p
          className="stage-in mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[17px] text-muted"
          style={{ ["--reveal-delay" as string]: "100ms" }}
        >
          <span>{data.tagline}</span>
        </p>
        {data.availability ? (
          <p
            className="stage-in mt-3 inline-flex items-center gap-2.5 text-[15px] font-medium text-fg"
            style={{ ["--reveal-delay" as string]: "160ms" }}
          >
            <span className="live-dot" aria-hidden />
            {data.availability} · {data.location}
          </p>
        ) : null}

        <p
          className="stage-in mt-14 max-w-[28ch] text-[clamp(28px,3.8vw,44px)] font-semibold leading-[1.14] tracking-[-0.03em] text-muted sm:mt-20"
          style={{ ["--reveal-delay" as string]: "240ms" }}
        >
          {renderLede(data.lede)}
        </p>
        <p
          className="stage-in mt-8 max-w-[62ch] text-[19px] leading-[1.6] tracking-[-0.012em] text-fg-soft"
          style={{ ["--reveal-delay" as string]: "320ms" }}
        >
          {data.support}
        </p>
      </div>
    </section>
  );
}

/** The numbers as statements: each figure reads as the start of a sentence. */
export function AboutNumbers({ stats }: { stats: AboutFrontmatterT["stats"] }) {
  if (stats.length === 0) return null;
  return (
    <ul className="border-b border-border">
      {stats.map((s) => (
        <li
          key={s.cap}
          className="border-t border-border py-6 text-[clamp(24px,3.2vw,36px)] font-semibold leading-[1.15] tracking-[-0.03em] text-muted sm:py-8"
        >
          <span className="text-fg">
            {s.num}
            {s.unit ? (s.unit === "★" ? "-star" : ` ${s.unit}`) : ""}
          </span>{" "}
          {s.cap}
        </li>
      ))}
    </ul>
  );
}
