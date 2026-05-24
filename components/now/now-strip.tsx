import { loadNow } from "@/lib/content/now";
import { NowCard } from "./now-card";

export function NowStrip() {
  const now = loadNow();
  return (
    <section
      id="now"
      data-section="now"
      className="scroll-mt-20 space-y-5 pt-12"
    >
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
            Now
          </div>
          <h2 className="font-serif text-[28px] italic leading-tight tracking-[-0.01em] text-fg">
            What I&apos;m into this season
          </h2>
        </div>
        <span className="font-mono text-[10.5px] text-muted-2">
          updated {now.updated}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {now.items.map((item) => (
          <NowCard key={`${item.kind}:${item.title}`} item={item} />
        ))}
      </div>
    </section>
  );
}
