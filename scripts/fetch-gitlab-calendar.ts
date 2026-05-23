import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const OUT_PATH = join(process.cwd(), "content/generated/gitlab-calendar.json");

export interface CalendarCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarSnapshot {
  fetchedAt: string;
  source: "gitlab" | "snapshot" | "seed";
  weeks: CalendarCell[][];
}

function levelFor(count: number): CalendarCell["level"] {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 15) return 3;
  return 4;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function buildGrid(today: Date, lookup: Record<string, number>): CalendarCell[][] {
  const cells: CalendarCell[] = [];
  const totalDays = 53 * 7;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = isoDate(d);
    const count = lookup[date] ?? 0;
    cells.push({ date, count, level: levelFor(count) });
  }
  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

function deterministicSeed(today: Date): Record<string, number> {
  const lookup: Record<string, number> = {};
  const totalDays = 53 * 7;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (totalDays - 1));
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const x = (i * 1103515245 + 12345) & 0x7fffffff;
    const r = (x % 100) / 100;
    let count = 0;
    if (r > 0.55) count = Math.floor(r * 8);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      count = r > 0.8 ? Math.floor(r * 4) : 0;
    }
    if (count > 0) lookup[isoDate(d)] = count;
  }
  return lookup;
}

async function fetchGitLab(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(GITLAB_URL, {
      headers: { "User-Agent": "reverse-resume-build/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[fetch-gitlab-calendar] HTTP ${res.status}; falling back.`);
      return null;
    }
    const data = await res.json();
    if (typeof data !== "object" || data === null) {
      console.warn(`[fetch-gitlab-calendar] unexpected payload shape; falling back.`);
      return null;
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(data)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  } catch (e) {
    console.warn(`[fetch-gitlab-calendar] fetch failed: ${(e as Error).message}; falling back.`);
    return null;
  }
}

function loadSnapshotIfPresent(): CalendarSnapshot | null {
  if (!existsSync(OUT_PATH)) return null;
  try {
    const raw = readFileSync(OUT_PATH, "utf-8");
    return JSON.parse(raw) as CalendarSnapshot;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const today = new Date();
  mkdirSync(dirname(OUT_PATH), { recursive: true });

  const remote = await fetchGitLab();
  if (remote) {
    const snapshot: CalendarSnapshot = {
      fetchedAt: today.toISOString(),
      source: "gitlab",
      weeks: buildGrid(today, remote),
    };
    writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
    console.log(`[fetch-gitlab-calendar] wrote fresh snapshot (${Object.keys(remote).length} dated entries).`);
    return;
  }

  const existing = loadSnapshotIfPresent();
  if (existing) {
    console.log(`[fetch-gitlab-calendar] using committed snapshot from ${existing.fetchedAt}.`);
    return;
  }

  const seed = deterministicSeed(today);
  const snapshot: CalendarSnapshot = {
    fetchedAt: today.toISOString(),
    source: "seed",
    weeks: buildGrid(today, seed),
  };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`[fetch-gitlab-calendar] no snapshot existed; wrote deterministic seed.`);
}

main().catch((e) => {
  console.error(`[fetch-gitlab-calendar] unhandled: ${(e as Error).message}`);
  process.exit(0);
});
