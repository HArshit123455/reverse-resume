import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildGrid, deterministicSeed, lookupFromRaw, type CalendarSnapshot } from "../lib/gitlab-calendar";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const OUT_PATH = join(process.cwd(), "content/generated/gitlab-calendar.json");

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
    return lookupFromRaw(data);
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
