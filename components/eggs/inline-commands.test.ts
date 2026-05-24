import { describe, it, expect } from "vitest";
import { detectInlineCommand } from "./inline-commands";

describe("detectInlineCommand", () => {
  it("matches sudo prefix and exposes the full input", () => {
    const r = detectInlineCommand("sudo make me a sandwich");
    expect(r?.kind).toBe("sudo");
    if (r?.kind === "sudo") {
      expect(r.input).toBe("sudo make me a sandwich");
    }
  });

  it("matches bare sudo", () => {
    expect(detectInlineCommand("sudo")?.kind).toBe("sudo");
  });

  it("does not match sudo as a substring of another word", () => {
    expect(detectInlineCommand("pseudoscience")).toBeNull();
  });

  it("matches whoami and /whoami exactly", () => {
    expect(detectInlineCommand("whoami")?.kind).toBe("whoami");
    expect(detectInlineCommand("/whoami")?.kind).toBe("whoami");
    expect(detectInlineCommand("WHOAMI")?.kind).toBe("whoami");
  });

  it("does not match whoami inside another word or with extra content", () => {
    expect(detectInlineCommand("whoamiwhocares")).toBeNull();
    expect(detectInlineCommand("whoami today")).toBeNull();
  });

  it("matches a love trigger", () => {
    const r = detectInlineCommand("hi mumma");
    expect(r?.kind).toBe("love");
    if (r?.kind === "love") {
      expect(r.trigger).toBe("mumma");
      expect(r.message).toBeTruthy();
    }
  });

  it("returns null for ordinary input", () => {
    expect(detectInlineCommand("what's your stack?")).toBeNull();
  });

  it("prefers sudo over love when sudo prefix matches", () => {
    expect(detectInlineCommand("sudo love")?.kind).toBe("sudo");
  });
});
