import { describe, it, expect } from "vitest";
import { hashIp, todayIstDateStr } from "./ip-hash";

describe("ip-hash", () => {
  it("returns a 64-char hex string", () => {
    const hash = hashIp("192.168.1.1", "daily-salt-abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = hashIp("1.2.3.4", "salt");
    const b = hashIp("1.2.3.4", "salt");
    expect(a).toBe(b);
  });

  it("changes when salt changes", () => {
    const a = hashIp("1.2.3.4", "salt-a");
    const b = hashIp("1.2.3.4", "salt-b");
    expect(a).not.toBe(b);
  });

  it("returns IST date string in YYYY-MM-DD form", () => {
    const str = todayIstDateStr(new Date("2026-05-10T18:00:00Z")); // 23:30 IST
    expect(str).toBe("2026-05-10");
  });

  it("rolls over at IST midnight", () => {
    // 18:30 UTC = 00:00 IST next day
    const str = todayIstDateStr(new Date("2026-05-10T18:30:00Z"));
    expect(str).toBe("2026-05-11");
  });
});
