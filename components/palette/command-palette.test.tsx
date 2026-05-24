import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CommandPalette } from "./command-palette";

describe("CommandPalette", () => {
  afterEach(() => cleanup());

  it("renders the 4 default sections when open with no query", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    expect(screen.getByText("Navigate")).toBeTruthy();
    expect(screen.getByText("Audience")).toBeTruthy();
    expect(screen.getByText("Connect")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("returns null when closed", () => {
    const { container } = render(
      <CommandPalette open={false} onClose={() => {}} onFire={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} onFire={() => {}} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("filters commands by the search query", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    const input = screen.getByLabelText("Search commands") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "github" } });
    expect(screen.getByText("GitHub")).toBeTruthy();
    expect(screen.queryByText("LinkedIn")).toBeNull();
  });

  it("surfaces a hidden command only when its keyword matches", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    expect(screen.queryByText("Enter the Matrix")).toBeNull();
    const input = screen.getByLabelText("Search commands") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "matrix" } });
    expect(screen.getByText("Enter the Matrix")).toBeTruthy();
  });

  it("fires the active command on Enter", () => {
    const onFire = vi.fn();
    render(<CommandPalette open={true} onClose={() => {}} onFire={onFire} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onFire).toHaveBeenCalledWith("nav.ask");
  });

  it("moves the active item with arrow keys", () => {
    const onFire = vi.fn();
    render(<CommandPalette open={true} onClose={() => {}} onFire={onFire} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onFire).toHaveBeenCalledWith("nav.work");
  });

  it("shows 'No matches.' when query matches nothing", () => {
    render(<CommandPalette open={true} onClose={() => {}} onFire={() => {}} />);
    const input = screen.getByLabelText("Search commands") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "zzzzzz-no-match" } });
    expect(screen.getByText("No matches.")).toBeTruthy();
  });
});
