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

export function buildGrid(today: Date, lookup: Record<string, number>): CalendarCell[][] {
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

export function deterministicSeed(today: Date): Record<string, number> {
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

export function lookupFromRaw(data: unknown): Record<string, number> | null {
  if (typeof data !== "object" || data === null) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function totalCommits(weeks: CalendarCell[][]): number {
  return weeks.reduce((sum, week) => sum + week.reduce((s, c) => s + c.count, 0), 0);
}
