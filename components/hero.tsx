"use client";

import { AudiencePills } from "./chat/audience-pills";
import type { Audience } from "@/lib/sse";

interface HeroProps {
  subheadline: string;
  audience: Audience;
  onAudienceChange: (next: Audience) => void;
}

export function Hero({ subheadline, audience, onAudienceChange }: HeroProps) {
  return (
    <header className="max-w-3xl space-y-7">
      {/* NOTE: eyebrow copy is the design-mock placeholder; user confirms/rewrites in Phase 5b content authoring. */}
      <div className="inline-flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted">
        <span
          aria-hidden
          className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent ring-4 ring-accent-soft animate-[pulse-dot_2.6s_ease-in-out_infinite]"
        />
        New Delhi · Delhi NCR
      </div>
      <h1 className="font-serif text-[clamp(48px,8vw,96px)] font-medium leading-[0.94] tracking-[-0.03em] text-fg">
        Ask my work <em className="font-medium italic text-accent">anything</em>.
      </h1>
      <p className="max-w-[580px] text-[17px] leading-[1.6] text-muted">{subheadline}</p>
      <div className="pt-2">
        <AudiencePills audience={audience} onChange={onAudienceChange} />
      </div>
    </header>
  );
}
