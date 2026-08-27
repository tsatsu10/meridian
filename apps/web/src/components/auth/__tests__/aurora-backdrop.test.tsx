import { render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuroraBackdrop } from "../aurora-backdrop";

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

describe("AuroraBackdrop", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("is hidden from assistive technology", () => {
    mockReducedMotion(false);
    const { container } = render(<AuroraBackdrop />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("animates the blooms by default", () => {
    mockReducedMotion(false);
    const { container } = render(<AuroraBackdrop />);
    expect(container.querySelectorAll("[data-aurora-bloom]").length).toBe(2);
    expect(
      container.querySelector("[data-aurora-animated='true']"),
    ).not.toBeNull();
  });

  it("renders static when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<AuroraBackdrop />);
    expect(container.querySelectorAll("[data-aurora-bloom]").length).toBe(2);
    expect(container.querySelector("[data-aurora-animated='true']")).toBeNull();
  });
});
