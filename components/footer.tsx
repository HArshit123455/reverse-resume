import Link from "next/link";
import { FooterCmdKTrigger } from "./palette/footer-cmd-k-trigger";

const SITE = [
  { href: "/", label: "Ask" },
  { href: "/#work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/chrysa", label: "Chrysa" },
];

const ELSEWHERE = [
  { href: "mailto:harshitsindhu10@gmail.com", label: "Email" },
  { href: "https://www.linkedin.com/in/harshit-sindhu/", label: "LinkedIn" },
  { href: "https://github.com/HArshit123455", label: "GitHub" },
  { href: "https://gitlab.com/harshit_sindhu", label: "GitLab" },
  { href: "https://leetcode.com/u/Harry_S/", label: "LeetCode" },
];

export function Footer() {
  return (
    <footer id="footer" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-5 pb-12 pt-10 text-[13px] sm:grid-cols-[1fr_auto_auto] sm:gap-16 sm:px-8">
        <p className="max-w-[40ch] leading-relaxed text-muted">
          © {new Date().getFullYear()} Harshit Sindhu. Built in TypeScript, deployed on a Tuesday.{" "}
          <FooterCmdKTrigger /> for the good stuff.
        </p>
        <nav aria-label="Site">
          <ul className="space-y-2">
            {SITE.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-fg-soft transition-colors hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Elsewhere">
          <ul className="space-y-2">
            {ELSEWHERE.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                  className="text-fg-soft transition-colors hover:text-fg"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
