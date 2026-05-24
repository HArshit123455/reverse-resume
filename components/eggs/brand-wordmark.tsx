"use client";

import Link from "next/link";
import { useLogoClickCounter } from "./use-logo-click-counter";
import { useToast } from "../toast";

export function BrandWordmark() {
  const toast = useToast();
  const { increment } = useLogoClickCounter((msg) => toast.show(msg));

  return (
    <Link
      href="/"
      onClick={(e) => {
        if (typeof window !== "undefined" && window.location.pathname === "/") {
          e.preventDefault();
        }
        increment();
      }}
      className="group inline-flex items-baseline gap-0 leading-none"
      aria-label="Harshit Sindhu — home"
    >
      <span className="font-serif text-2xl font-medium italic tracking-tight text-fg">
        harshit
      </span>
      <span
        aria-hidden
        className="ml-[3px] inline-block h-1.5 w-1.5 translate-y-0.5 rounded-full bg-accent"
      />
      <small className="ml-3.5 border-l border-border pl-3.5 font-sans text-xs font-normal not-italic text-muted">
        Full-stack engineer
      </small>
    </Link>
  );
}
