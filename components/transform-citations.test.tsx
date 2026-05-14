import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { transformCitations } from "./transform-citations";
import { CitationsProvider, useCitations, type CitationCard } from "./citations-context";

function makeCard(n: number): CitationCard {
  return {
    n,
    chunk: {
      sourceType: "snippet",
      title: `Card ${n}`,
      content: `content for card ${n}`,
    },
  };
}

function Seed({ cards, children }: { cards: CitationCard[]; children: React.ReactNode }) {
  const { addCitation } = useCitations();
  if (!(Seed as unknown as { _s?: boolean })._s) {
    (Seed as unknown as { _s?: boolean })._s = true;
    cards.forEach(addCitation);
  }
  return <>{children}</>;
}

function renderWithCitations(cards: CitationCard[], children: React.ReactNode) {
  (Seed as unknown as { _s?: boolean })._s = false; // reset between tests
  return render(
    <CitationsProvider>
      <Seed cards={cards}>{children}</Seed>
    </CitationsProvider>
  );
}

describe("transformCitations", () => {
  it("splits a plain string node and emits CitationMarkers for each [N]", () => {
    const { container } = renderWithCitations(
      [makeCard(1), makeCard(2)],
      <div>{transformCitations(["See [1] and [2] for details."])}</div>
    );
    const buttons = container.querySelectorAll("sup button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe("1");
    expect(buttons[1].textContent).toBe("2");
    expect(container.textContent).toContain("See ");
    expect(container.textContent).toContain(" and ");
    expect(container.textContent).toContain(" for details.");
  });

  it("returns input unchanged when no citation markers are present", () => {
    const { container } = renderWithCitations(
      [],
      <div>{transformCitations(["plain text with no citations"])}</div>
    );
    expect(container.querySelectorAll("sup").length).toBe(0);
    expect(container.textContent).toBe("plain text with no citations");
  });

  it("handles multi-digit citation numbers", () => {
    const { container } = renderWithCitations(
      [makeCard(12)],
      <div>{transformCitations(["With ref [12]"])}</div>
    );
    const btn = container.querySelector("sup button");
    expect(btn?.textContent).toBe("12");
  });

  it("renders inert <sup> when citation is not yet in context (regression guard)", () => {
    const { container } = renderWithCitations(
      [],
      <div>{transformCitations(["See [1] for details."])}</div>
    );
    expect(container.querySelectorAll("sup").length).toBe(1);
    expect(container.querySelectorAll("sup button").length).toBe(0);
    expect(container.textContent).toContain("[1]");
  });
});
