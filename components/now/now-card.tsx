import type { NowFrontmatterT } from "@/lib/content/now";

type NowItem = NowFrontmatterT["items"][number];

function Icon({ kind }: { kind: NowItem["kind"] }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "Building":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
        </svg>
      );
    case "Reading":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );
    case "Learning":
      return (
        <svg {...common}>
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "Listening":
      return (
        <svg {...common}>
          <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2" />
        </svg>
      );
  }
}

interface NowCardProps {
  item: NowItem;
}

export function NowCard({ item }: NowCardProps) {
  return (
    <article
      data-now-card
      data-kind={item.kind}
      className="flex h-full flex-col gap-2 rounded-[12px] border border-border bg-bg-elev p-4"
    >
      <header className="flex items-center gap-1.5 text-muted">
        <Icon kind={item.kind} />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.10em]">{item.kind}</span>
      </header>
      <h3 className="font-serif text-[16px] italic leading-tight text-fg">{item.title}</h3>
      <p className="text-[13px] leading-snug text-fg-soft">{item.desc}</p>
    </article>
  );
}
