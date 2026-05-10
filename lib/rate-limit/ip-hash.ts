import { createHash } from "node:crypto";

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

/**
 * Returns the date in IST (Asia/Kolkata = UTC+5:30) as YYYY-MM-DD.
 * Used both for spend tracking and for rotating the daily salt.
 */
export function todayIstDateStr(now: Date = new Date()): string {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  return istNow.toISOString().slice(0, 10);
}
