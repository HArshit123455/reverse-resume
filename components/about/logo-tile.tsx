"use client";

import { useState } from "react";

export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase()).join("");
}

/** Logos are drawn for white paper, so the tile stays white in both themes. */
export function LogoTile({ name, logo }: { name: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logo && !failed;

  return (
    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-[16px] bg-white ring-1 ring-inset ring-black/5 sm:h-16 sm:w-16 sm:rounded-[18px]">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={`${name} logo`}
          width={44}
          height={44}
          className="h-9 w-9 object-contain sm:h-11 sm:w-11"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[17px] font-bold tracking-[-0.02em] text-[#1d1d1f]">{monogramFor(name)}</span>
      )}
    </div>
  );
}
