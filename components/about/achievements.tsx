export function Achievements({ items }: { items: string[] }) {
  return (
    <ul className="border-b border-border">
      {items.map((a) => (
        <li key={a} className="border-t border-border py-6 text-[19px] leading-[1.5] tracking-[-0.014em] text-fg-soft">
          {a}
        </li>
      ))}
    </ul>
  );
}
