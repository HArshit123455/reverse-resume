import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CitationMarker } from "./citation-marker";
import { CitationsProvider, useCitations, type CitationCard } from "./citations-context";

function withCitation(card: CitationCard, ui: React.ReactNode) {
  function Inner() {
    const { addCitation } = useCitations();
    if ((Inner as unknown as { _seeded?: boolean })._seeded !== true) {
      (Inner as unknown as { _seeded?: boolean })._seeded = true;
      addCitation(card);
    }
    return <>{ui}</>;
  }
  return render(
    <CitationsProvider>
      <Inner />
    </CitationsProvider>
  );
}

const sampleCard: CitationCard = {
  n: 1,
  chunk: {
    sourceType: "snippet",
    sourceProject: "reverse-resume",
    filePath: "content/snippets/postgres-token-bucket.mdx",
    title: "Postgres Token-Bucket",
    content: "Atomic per-IP rate limit using Postgres only — no Redis required. A single INSERT … ON CONFLICT does refill and decrement in one round trip.",
  },
};

describe("CitationMarker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders a sup>button with the citation number", () => {
    withCitation(sampleCard, <CitationMarker n={1} />);
    const btn = screen.getByRole("button");
    expect(btn.textContent).toBe("1");
    expect(btn.closest("sup")).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toMatch(/citation 1/i);
  });

  it("shows popover after 150ms hover and hides on leave", () => {
    withCitation(sampleCard, <CitationMarker n={1} />);
    const btn = screen.getByRole("button");
    fireEvent.mouseEnter(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByRole("tooltip").textContent).toContain("Postgres Token-Bucket");
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders inert <sup>[N]</sup> when citation is not yet in context", () => {
    render(
      <CitationsProvider>
        <CitationMarker n={99} />
      </CitationsProvider>
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("[99]")).toBeInTheDocument();
  });
});
