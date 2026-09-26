import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement, type ReactNode } from "react";
import { loadChrysa, slugify } from "@/lib/content/chrysa";
import { ChapterNav } from "@/components/chrysa/chapter-nav";
import { StageReveal } from "@/components/ui/stage-reveal";
import { Icon } from "@/components/ui/icon";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Chrysa — how it was made · Harshit Sindhu",
  description:
    "The full story of Chrysa, a privacy-first life companion for Android and iPhone: what it is, why it exists, and how it was designed, built and shipped.",
};

// Intrinsic sizes of the phone screens, so the grid reserves their space before they load.
const SCREEN_SIZES: Record<string, [number, number]> = {
  "/chrysa/screens/home.jpg": [738, 1600],
  "/chrysa/screens/you.jpg": [738, 1600],
  "/chrysa/screens/log.jpg": [720, 1650],
  "/chrysa/screens/progress.jpg": [720, 1205],
};

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ChrysaPage() {
  const { data, body, chapters, minutes } = loadChrysa();

  return (
    <>
      <main>
        {/* Stage one: the name, as a keynote title card. */}
        <section className="px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-28 sm:pt-28">
          <div className="mx-auto max-w-[900px]">
            {data.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.icon}
                alt="The Chrysa app icon: a crescent over dusk hills"
                width={112}
                height={112}
                className="stage-in mx-auto h-24 w-24 rounded-[26px] sm:h-28 sm:w-28 sm:rounded-[30px]"
              />
            ) : null}
            <h1
              className="stage-in mt-8 text-[clamp(64px,13vw,96px)] font-bold leading-[0.95] tracking-[-0.045em] text-fg [font-stretch:104%]"
              style={{ ["--reveal-delay" as string]: "100ms" }}
            >
              {data.title}
            </h1>
            <p
              className="stage-in mx-auto mt-6 max-w-[26ch] text-[clamp(22px,2.8vw,30px)] font-semibold leading-[1.2] tracking-[-0.025em] text-fg-soft"
              style={{ ["--reveal-delay" as string]: "200ms" }}
            >
              {data.dek}
            </p>
            <p
              className="stage-in mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.5] text-muted"
              style={{ ["--reveal-delay" as string]: "280ms" }}
            >
              {data.summary}
            </p>
            <p
              className="stage-in mt-8 text-[14px] text-muted"
              style={{ ["--reveal-delay" as string]: "340ms" }}
            >
              By Harshit Sindhu · Updated <time dateTime={data.updated}>{formatDate(data.updated)}</time> ·{" "}
              {minutes} min read
            </p>
          </div>
        </section>

        {/* At a glance: a spec sheet, not a stat wall. */}
        <section aria-labelledby="glance-heading" className="px-5 sm:px-8">
          <div className="mx-auto max-w-[1120px] rounded-tile bg-bg-elev px-6 py-12 sm:px-14 sm:py-16">
            <StageReveal>
              <h2
                id="glance-heading"
                className="text-[clamp(30px,4vw,44px)] font-bold leading-none tracking-[-0.035em] text-fg"
              >
                At a glance.
              </h2>
            </StageReveal>
            <StageReveal delay={100}>
              <dl className="mt-10 grid gap-x-14 sm:grid-cols-2">
                {data.facts.map((f) => (
                  <div
                    key={f.label}
                    className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-4 border-t border-border py-4 sm:py-5"
                  >
                    <dt className="text-[15px] text-muted">{f.label}</dt>
                    <dd className="text-[17px] font-medium leading-snug tracking-[-0.012em] text-fg">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </StageReveal>
          </div>
        </section>

        {/* The long read. */}
        <div className="px-5 pb-10 pt-20 sm:px-8 sm:pt-28">
          <div className="mx-auto grid max-w-[1120px] gap-16 lg:grid-cols-[220px_minmax(0,680px)] lg:justify-between">
            <aside className="hidden lg:block">
              <ChapterNav chapters={chapters} />
            </aside>
            <article className="story-prose min-w-0 [&_h2]:scroll-mt-20">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // A paragraph made only of images is a row of phone screens.
                  p: ({ node, children }) => {
                    const kids = node?.children ?? [];
                    const onlyImages =
                      kids.length > 0 &&
                      kids.every(
                        (c) =>
                          (c.type === "element" && c.tagName === "img") ||
                          (c.type === "text" && !c.value.trim())
                      );
                    if (!onlyImages) return <p>{children}</p>;
                    return (
                      <div
                        role="group"
                        aria-label="Screens from the app"
                        className="phone-row -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:items-start sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0"
                      >
                        {children}
                      </div>
                    );
                  },
                  img: ({ src, alt, title }) => (
                    <figure className="w-[64%] flex-none snap-start sm:w-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={typeof src === "string" ? src : undefined}
                        alt={alt ?? ""}
                        width={typeof src === "string" ? SCREEN_SIZES[src]?.[0] : undefined}
                        height={typeof src === "string" ? SCREEN_SIZES[src]?.[1] : undefined}
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-full rounded-[28px] ring-1 ring-border"
                      />
                      {title ? (
                        <figcaption className="mt-3 text-[14px] leading-snug text-muted">{title}</figcaption>
                      ) : null}
                    </figure>
                  ),
                  h2: ({ children }) => <h2 id={slugify(textOf(Children.toArray(children)))}>{children}</h2>,
                  a: ({ href, children }) => (
                    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {body}
              </ReactMarkdown>
            </article>
          </div>
        </div>

        {/* Three weeks, as a dated list. */}
        <section aria-labelledby="timeline-heading" className="px-5 pb-24 pt-16 sm:px-8 sm:pb-32">
          <div className="mx-auto max-w-[1120px]">
            <StageReveal>
              <h2
                id="timeline-heading"
                className="max-w-[18ch] text-[clamp(38px,5.6vw,64px)] font-bold leading-[1.02] tracking-[-0.04em] text-fg"
              >
                Three weeks, day by day.
              </h2>
            </StageReveal>
            <ol className="mt-12 border-b border-border">
              {data.timeline.map((t) => (
                <li
                  key={t.date}
                  className="grid gap-1 border-t border-border py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8"
                >
                  <span className="tabular text-[15px] font-semibold tracking-[-0.01em] text-fg">
                    {t.date}
                  </span>
                  <span className="max-w-[64ch] text-[17px] leading-[1.5] text-fg-soft">{t.event}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[13px] text-muted">All dates 2026.</p>
          </div>
        </section>

        {/* Close. */}
        <section className="px-5 pb-24 sm:px-8 sm:pb-32">
          <StageReveal className="mx-auto max-w-[1120px] rounded-tile bg-bg-elev px-6 py-14 text-center sm:px-14 sm:py-20">
            <h2 className="mx-auto max-w-[20ch] text-[clamp(32px,4.6vw,52px)] font-bold leading-[1.05] tracking-[-0.038em] text-fg">
              Want the rest of the work?
            </h2>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex h-12 items-center gap-2 rounded-pill bg-fg px-6 text-[16px] font-medium text-bg transition-transform duration-300 ease-stage hover:scale-[1.02]"
              >
                Ask my work anything
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center rounded-pill px-6 text-[16px] font-medium text-fg ring-1 ring-inset ring-border-strong transition-colors hover:ring-fg"
              >
                About me
              </Link>
            </div>
            {data.links.length > 0 && (
              <ul className="mt-9 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[15px]">
                {data.links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-fg-soft underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
                    >
                      {l.label}
                      <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </StageReveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
