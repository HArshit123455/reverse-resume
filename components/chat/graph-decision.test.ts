import { describe, it, expect } from "vitest";
import { graphDecision } from "./graph-decision";

describe("graphDecision", () => {
  it("renders nothing without WebGL", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: false, webgl: false })).toBe("none");
  });
  it("renders nothing on mobile", () => {
    expect(graphDecision({ isDesktop: false, reducedMotion: false, webgl: true })).toBe("none");
  });
  it("renders a static frame when reduced motion is requested", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: true, webgl: true })).toBe("static");
  });
  it("animates on desktop with WebGL and motion allowed", () => {
    expect(graphDecision({ isDesktop: true, reducedMotion: false, webgl: true })).toBe("animate");
  });
});
