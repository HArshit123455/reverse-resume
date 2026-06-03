import { Icon } from "./icons";

export function Achievements({ items }: { items: string[] }) {
  return (
    <div className="border-t border-border">
      {items.map((a) => (
        <div
          key={a}
          className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-3.5 border-b border-border py-[18px]"
        >
          <span className="mt-0.5 text-accent" aria-hidden>
            <Icon name="arrow-right" className="h-[15px] w-[15px]" />
          </span>
          <p className="text-pretty text-[17px] leading-[1.55] text-fg-soft">{a}</p>
        </div>
      ))}
    </div>
  );
}
