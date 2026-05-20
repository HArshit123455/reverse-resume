import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudiencePills } from "./audience-pills";

describe("AudiencePills", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders three radio-style buttons with accessible labels", () => {
    render(<AudiencePills audience="curious" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /curious/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /recruiter/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /engineer/i })).toBeInTheDocument();
  });

  it("marks the active pill with aria-checked", () => {
    render(<AudiencePills audience="recruiter" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /recruiter/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /curious/i })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange and writes to localStorage on click", () => {
    const onChange = vi.fn();
    render(<AudiencePills audience="curious" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /engineer/i }));
    expect(onChange).toHaveBeenCalledWith("engineer");
    expect(localStorage.getItem("rr_audience")).toBe("engineer");
  });
});
