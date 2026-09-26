export function SectionHead({ title, id }: { title: string; id?: string }) {
  return (
    <h2
      id={id}
      className="mb-10 text-[clamp(38px,5.6vw,64px)] font-bold leading-[1.02] tracking-[-0.04em] text-fg sm:mb-14"
    >
      {title}
    </h2>
  );
}
