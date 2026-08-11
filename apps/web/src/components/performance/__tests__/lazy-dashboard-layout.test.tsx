import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LazyDashboardLayout from "../lazy-dashboard-layout";

describe("LazyDashboardLayout", () => {
  it("keeps the root container free of transform/will-change/contain, since any of those would make it the containing block for the fixed-position dock nested inside it (anchoring the dock to this div's own box instead of the viewport)", () => {
    const { container } = render(
      <LazyDashboardLayout>
        <div>content</div>
      </LazyDashboardLayout>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.transform).toBe("");
    expect(root.style.willChange).toBe("");
    expect(root.style.contain).toBe("");
  });

  it("scopes the performance styling to the content wrapper, a sibling of the dock area rather than an ancestor of it", () => {
    render(
      <LazyDashboardLayout>
        <div data-testid="page-content">content</div>
      </LazyDashboardLayout>,
    );

    const contentWrapper = screen.getByTestId("page-content")
      .parentElement as HTMLElement;
    expect(contentWrapper.style.transform).toBe("translateZ(0)");
  });
});
