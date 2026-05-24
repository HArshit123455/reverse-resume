import { describe, it, expect } from "vitest";
import { detectLoveTrigger, LOVE_TRIGGERS, LOVE_MESSAGES } from "./use-love-triggers";

describe("detectLoveTrigger", () => {
  it("matches a trigger as a whole word", () => {
    expect(detectLoveTrigger("hi mumma")?.trigger).toBe("mumma");
    expect(detectLoveTrigger("mumma is here")?.trigger).toBe("mumma");
    expect(detectLoveTrigger("MUMMA")?.trigger).toBe("mumma");
  });

  it("does not match a trigger inside another word", () => {
    expect(detectLoveTrigger("lover")).toBeNull();
    expect(detectLoveTrigger("hovercraft")).toBeNull();
  });

  it("matches around punctuation", () => {
    expect(detectLoveTrigger("love.")?.trigger).toBe("love");
    expect(detectLoveTrigger("hey, love!")?.trigger).toBe("love");
    expect(detectLoveTrigger("love?")?.trigger).toBe("love");
  });

  it("matches multi-word triggers and prefers longer matches", () => {
    expect(detectLoveTrigger("oh laal mirch on top")?.trigger).toBe("laal mirch");
    expect(detectLoveTrigger("love you")?.trigger).toBe("love you");
  });

  it("matches the emoji trigger", () => {
    expect(detectLoveTrigger("harshit❤")?.trigger).toBe("harshit❤");
  });

  it("uses LOVE_MESSAGES when a mapping exists", () => {
    expect(detectLoveTrigger("mumma")?.message).toBe(LOVE_MESSAGES["mumma"]);
  });

  it("returns a non-empty message for every listed trigger", () => {
    for (const trigger of LOVE_TRIGGERS) {
      const r = detectLoveTrigger(trigger);
      expect(r?.message).toBeTruthy();
    }
  });

  it("returns null for non-matching input", () => {
    expect(detectLoveTrigger("hello world")).toBeNull();
    expect(detectLoveTrigger("")).toBeNull();
  });

  it("exposes the spec-listed trigger list", () => {
    expect(LOVE_TRIGGERS).toContain("mumma");
    expect(LOVE_TRIGGERS).toContain("love");
    expect(LOVE_TRIGGERS).toContain("harshit❤");
  });
});
