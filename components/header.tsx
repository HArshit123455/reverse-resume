import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { BrandWordmark } from "./eggs/brand-wordmark";
import { CmdKPill } from "./palette/cmd-k-pill";

const NAV = [
  { href: "/#work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/chrysa", label: "Chrysa" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-nav backdrop-blur-xl backdrop-saturate-[1.8]">
      <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8">
        <BrandWordmark />
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-pill px-2.5 py-1 text-[13px] text-fg-soft transition-colors duration-300 hover:text-fg sm:px-3"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
          <CmdKPill />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
