import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownMessage } from "./markdown-message";
import { CitationsProvider, useCitations, type CitationCard } from "./citations-context";

const seedCard: CitationCard = {
  n: 1,
  chunk: {
    sourceType: "snippet",
    title: "Token Bucket",
    content: "atomic SQL …",
  },
};

function Seeded({ md, cards }: { md: string; cards?: CitationCard[] }) {
  function Inner() {
    const { addCitation } = useCitations();
    if (!(Inner as unknown as { _s?: boolean })._s) {
      (Inner as unknown as { _s?: boolean })._s = true;
      (cards ?? []).forEach(addCitation);
    }
    return <MarkdownMessage content={md} />;
  }
  return (
    <CitationsProvider>
      <Inner />
    </CitationsProvider>
  );
}

describe("MarkdownMessage", () => {
  it("renders **bold** as <strong>", () => {
    render(<Seeded md="hello **world**" />);
    expect(screen.getByText("world").tagName.toLowerCase()).toBe("strong");
  });

  it("transforms [N] citation markers into focusable buttons", () => {
    render(<Seeded md="See [1] for proof." cards={[seedCard]} />);
    const btn = screen.getByRole("button", { name: /citation 1/i });
    expect(btn).toBeInTheDocument();
  });

  it("renders fenced code blocks via ShikiCode (falls back to <pre>)", () => {
    render(<Seeded md={"```ts\nconst x = 1;\n```"} />);
    // ShikiCode renders an aria-labeled region; the fallback is <pre>.
    const region = screen.getByRole("region", { name: /code excerpt/i });
    expect(region).toBeInTheDocument();
  });

  it("leaves [N] inside fenced code blocks literal", () => {
    render(<Seeded md={"```ts\nconst note = \"[1] not a citation\";\n```"} cards={[seedCard]} />);
    // No CitationMarker button should be rendered when only citation appears in code
    expect(screen.queryByRole("button", { name: /citation 1/i })).toBeNull();
  });
  it("keeps inline code inline instead of turning it into a code block", () => {
    const { container } = render(<MarkdownMessage content={"Uses `ON CONFLICT` in one statement."} />);
    expect(screen.queryByRole("region", { name: /code excerpt/i })).toBeNull();
    const code = container.querySelector("p code");
    expect(code?.textContent).toBe("ON CONFLICT");
    expect(container.querySelector("p pre")).toBeNull();
  });
  it("keeps the same code block node while an answer streams in", () => {
    const first = "Intro.\n\n```ts\nconst a = 1;\n```\n\nMore";
    const { container, rerender } = render(<MarkdownMessage content={first} />);
    const before = container.querySelector("[role=region]");
    rerender(<MarkdownMessage content={first + " text arriving token by token"} />);
    // a new node here means React rebuilt the block, which is what made answers flicker
    expect(container.querySelector("[role=region]")).toBe(before);
  });
});
