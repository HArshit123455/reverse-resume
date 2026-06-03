export function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-[30px] flex items-baseline gap-4">
      <span className="font-mono text-[13px] font-medium tracking-[0.04em] text-accent">{num}</span>
      <h2 className="whitespace-nowrap font-serif text-[clamp(30px,4.4vw,42px)] font-medium leading-none tracking-[-0.022em] text-fg max-[560px]:whitespace-normal">
        {title}
      </h2>
      <span className="h-px flex-1 bg-border max-[560px]:hidden" aria-hidden />
    </div>
  );
}
