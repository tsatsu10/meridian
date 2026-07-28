import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlassPanel } from "../glass-panel";

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

describe("GlassPanel", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("renders its children", () => {
    mockReducedMotion(false);
    render(<GlassPanel>panel content</GlassPanel>);
    expect(screen.getByText("panel content")).toBeInTheDocument();
  });

  it("tilts toward the pointer", () => {
    mockReducedMotion(false);
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const panel = container.querySelector("[data-glass-panel]") as HTMLElement;

    fireEvent.mouseMove(panel, { clientX: 0, clientY: 0 });
    expect(panel.style.transform).toMatch(/rotate[XY]/);
  });

  it("does not tilt when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const panel = container.querySelector("[data-glass-panel]") as HTMLElement;

    fireEvent.mouseMove(panel, { clientX: 0, clientY: 0 });
    expect(panel.style.transform).toBe("");
  });
});
