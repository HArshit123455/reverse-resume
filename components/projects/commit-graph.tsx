import { getGitlabCalendar } from "@/lib/gitlab";
import { totalCommits } from "@/lib/gitlab-calendar";
import { StageReveal } from "../ui/stage-reveal";

function formatCount(count: number): string {
  if (count === 0) return "No commits";
  if (count === 1) return "1 commit";
  return `${count} commits`;
}

/** The activity stage: one number as the statement, the year of commits under it. */
export async function CommitGraph() {
  const calendar = await getGitlabCalendar();
  const total = totalCommits(calendar.weeks);
  const fetchedAt = new Date(calendar.fetchedAt).toISOString().slice(0, 10);
  const freshness = calendar.source === "gitlab" ? "Live from GitLab" : `GitLab snapshot, ${fetchedAt}`;
  const weeks = calendar.weeks.length;

  return (
    <section
      id="activity"
      aria-labelledby="activity-heading"
      className="scroll-mt-12 px-5 pb-24 sm:px-8 sm:pb-36"
    >
      <div
        data-commit-graph
        data-source={calendar.source}
        className="mx-auto max-w-[1120px] rounded-tile bg-bg-elev px-6 py-12 sm:px-14 sm:py-20"
      >
        <StageReveal>
          <h2
            id="activity-heading"
            className="max-w-[16ch] text-[clamp(40px,6.4vw,72px)] font-bold leading-[1.02] tracking-[-0.04em] text-fg [font-stretch:104%]"
          >
            {total.toLocaleString("en-US")} commits in the last year.
          </h2>
          <p className="mt-5 text-[clamp(17px,1.8vw,21px)] font-medium tracking-[-0.015em] text-muted">
            Every contribution on GitLab, one square per day.
          </p>
        </StageReveal>

        <StageReveal delay={120} className="mt-12 sm:mt-16">
          <div className="-mx-2 overflow-x-auto px-2 pb-2">
            <div
              role="img"
              aria-label={`GitLab commit graph: ${total} commits over the last ${weeks} weeks (${freshness}).`}
              className="grid min-w-[640px] gap-[3px] sm:gap-1"
              style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
            >
              {calendar.weeks.map((week, w) => (
                <div key={w} className="grid grid-rows-7 gap-[3px] sm:gap-1">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date}: ${formatCount(cell.count)}`}
                      data-l={cell.level}
                      className="aspect-square w-full rounded-[3px]"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
            <span>{freshness} · last {weeks} weeks</span>
            <span className="flex items-center gap-1.5">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} data-l={l} className="h-3 w-3 rounded-[3px]" aria-hidden />
              ))}
              <span>More</span>
            </span>
          </div>
        </StageReveal>
      </div>
    </section>
  );
}
