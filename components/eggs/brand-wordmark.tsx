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
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        increment();
      }}
      className="text-[15px] font-semibold tracking-[-0.02em] text-fg"
      aria-label="Harshit Sindhu — home"
    >
      Harshit Sindhu
    </Link>
  );
}
