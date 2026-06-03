import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/about/reveal";

describe("Reveal", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
  });

  it("renders its children", () => {
    render(
      <Reveal>
        <p>hello body</p>
      </Reveal>
    );
    expect(screen.getByText("hello body")).toBeInTheDocument();
  });

  it("marks children visible immediately when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(
      <Reveal>
        <p>reduced</p>
      </Reveal>
    );
    expect(container.firstChild).toHaveAttribute("data-revealed", "true");
  });
});
