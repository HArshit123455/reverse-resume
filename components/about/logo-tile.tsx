"use client";

import { useState } from "react";

export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase()).join("");
}

export function LogoTile({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logo && !failed;

  return (
    <div
      className="grid h-16 w-16 place-items-center overflow-hidden rounded-[15px] border border-border shadow-sm transition-transform duration-200 max-[560px]:h-12 max-[560px]:w-12"
      style={{ background: "#f6f4ee" }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          width={44}
          height={44}
          className="h-11 w-11 object-contain max-[560px]:h-8 max-[560px]:w-8"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-serif text-[18px] font-medium tracking-[-0.01em] text-[#15171a]">
          {monogramFor(name)}
        </span>
      )}
    </div>
  );
}
