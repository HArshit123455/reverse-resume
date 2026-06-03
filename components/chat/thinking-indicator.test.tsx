import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  }));
}

describe("ThinkingIndicator", () => {
  beforeEach(() => {
    setReducedMotion(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows a retrieving verb first", () => {
    render(<ThinkingIndicator phase="retrieving" />);
    expect(screen.getByText("Reading the codebase…")).toBeInTheDocument();
  });

  it("exposes a stable accessible status label", () => {
    render(<ThinkingIndicator phase="retrieving" />);
    expect(screen.getByRole("status")).toHaveTextContent("Working on your answer…");
  });

  it("rotates verbs on a timer and holds on the last one", () => {
    render(<ThinkingIndicator phase="retrieving" />);
    expect(screen.getByText("Reading the codebase…")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText("Searching commits…")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText("Thinking…")).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText("Pulling the right sources…")).toBeInTheDocument();

    // long wait holds on the final verb instead of looping back
    act(() => void vi.advanceTimersByTime(2000 * 5));
    expect(screen.getByText("Pulling the right sources…")).toBeInTheDocument();
  });

  it("switches to generating verbs (reset to first) when the phase changes", () => {
    const { rerender } = render(<ThinkingIndicator phase="retrieving" />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText("Searching commits…")).toBeInTheDocument();

    rerender(<ThinkingIndicator phase="generating" />);
    expect(screen.getByText("Connecting the dots…")).toBeInTheDocument();
  });

  it("shows a single static verb under reduced motion (no rotation)", () => {
    setReducedMotion(true);
    render(<ThinkingIndicator phase="generating" />);
    expect(screen.getByText("Connecting the dots…")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(2000 * 4));
    expect(screen.getByText("Connecting the dots…")).toBeInTheDocument();
  });
});
