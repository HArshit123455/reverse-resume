export type GraphMode = "animate" | "static" | "none";

export function graphDecision(opts: {
  isDesktop: boolean;
  reducedMotion: boolean;
  webgl: boolean;
}): GraphMode {
  if (!opts.webgl || !opts.isDesktop) return "none";
  return opts.reducedMotion ? "static" : "animate";
}
