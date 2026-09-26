"use client";

import { AudiencePills } from "./chat/audience-pills";
import type { Audience } from "@/lib/sse";

interface HeroProps {
  subheadline: string;
  audience: Audience;
  onAudienceChange: (next: Audience) => void;
  /** compact = a conversation is under way; the statement steps back */
  compact?: boolean;
}

export function Hero({ subheadline, audience, onAudienceChange, compact }: HeroProps) {
  if (compact) {
    return (
      <header className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-[clamp(32px,4.4vw,48px)] font-bold leading-[1.02] tracking-[-0.035em] text-fg">
          Ask my work anything.
        </h1>
        <AudiencePills audience={audience} onChange={onAudienceChange} />
      </header>
    );
  }
  return (
    <header className="flex flex-col items-center text-center">
      <h1
        className="stage-in text-[clamp(52px,10.4vw,96px)] font-bold leading-[0.98] tracking-[-0.04em] text-fg [font-stretch:104%]"
      >
        Ask my work anything.
      </h1>
      <p
        className="stage-in mt-6 max-w-[34ch] text-[clamp(19px,2.2vw,24px)] font-medium leading-[1.35] tracking-[-0.02em] text-muted"
        style={{ ["--reveal-delay" as string]: "120ms" }}
      >
        {subheadline}
      </p>
      <div className="stage-in mt-10" style={{ ["--reveal-delay" as string]: "220ms" }}>
        <AudiencePills audience={audience} onChange={onAudienceChange} />
      </div>
    </header>
  );
}
