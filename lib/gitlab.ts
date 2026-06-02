import snapshotJson from "@/content/generated/gitlab-calendar.json";
import { buildGrid, lookupFromRaw, deterministicSeed, type CalendarSnapshot } from "./gitlab-calendar";

const GITLAB_URL = "https://gitlab.com/users/harshit_sindhu/calendar.json";
const REVALIDATE_SECONDS = 21600; // 6 hours

const committedSnapshot = snapshotJson as CalendarSnapshot;

export async function getGitlabCalendar(): Promise<CalendarSnapshot> {
  const today = new Date();
  try {
    const res = await fetch(GITLAB_URL, {
      headers: { "User-Agent": "reverse-resume/1.0" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (res.ok) {
      const lookup = lookupFromRaw(await res.json());
      if (lookup) {
        return { fetchedAt: today.toISOString(), source: "gitlab", weeks: buildGrid(today, lookup) };
      }
    }
  } catch {
    // fall through to committed snapshot
  }

  if (committedSnapshot && Array.isArray(committedSnapshot.weeks) && committedSnapshot.weeks.length > 0) {
    return { ...committedSnapshot, source: "snapshot" };
  }

  return { fetchedAt: today.toISOString(), source: "seed", weeks: buildGrid(today, deterministicSeed(today)) };
}
