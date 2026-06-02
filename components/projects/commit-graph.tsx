import { getGitlabCalendar } from "@/lib/gitlab";
import { totalCommits } from "@/lib/gitlab-calendar";

function formatCount(count: number): string {
  if (count === 0) return "No commits";
  if (count === 1) return "1 commit";
  return `${count} commits`;
}

export async function CommitGraph() {
  const calendar = await getGitlabCalendar();
  const total = totalCommits(calendar.weeks);
  const fetchedAt = new Date(calendar.fetchedAt).toISOString().slice(0, 10);
  const freshness = calendar.source === "gitlab" ? "live" : `snapshot ${fetchedAt}`;

  return (
    <div
      data-commit-graph
      data-source={calendar.source}
      className="rounded-[12px] border border-border bg-bg-elev p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-muted">
          GitLab activity · last 53 weeks
        </div>
        <div className="font-mono text-[11px] text-muted-2">
          {total} commits · {freshness}
        </div>
      </div>
      <div
        role="img"
        aria-label={`GitLab commit graph: ${total} commits over the last 53 weeks (${freshness}).`}
        className="grid auto-cols-min grid-flow-col gap-[3px] overflow-x-auto"
      >
        {calendar.weeks.map((week, w) => (
          <div key={w} className="grid grid-rows-7 gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} — ${formatCount(cell.count)}`}
                data-l={cell.level}
                className="h-[11px] w-[11px] rounded-[2px]"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10.5px] text-muted-2">
        <span>less</span>
        <span data-l={0} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={1} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={2} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={3} className="h-[10px] w-[10px] rounded-[2px]" />
        <span data-l={4} className="h-[10px] w-[10px] rounded-[2px]" />
        <span>more</span>
      </div>
    </div>
  );
}
