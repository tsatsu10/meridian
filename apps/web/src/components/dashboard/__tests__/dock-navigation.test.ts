import { describe, expect, it } from "vitest";
import { navigationItems } from "../dock-navigation";

describe("dock-navigation navigationItems", () => {
  it("never links to /chat, which has no route or backend", () => {
    // Regression: the persistent dock (rendered on every dashboard page)
    // linked to /chat, a route that doesn't exist anywhere in the app —
    // every click landed on the 404 page. Confirmed via a repo-wide grep
    // for both a route file and any api backend under that name; neither
    // exists, so the link was removed rather than pointed at a stub.
    expect(navigationItems.some((item) => item.href === "/chat")).toBe(false);
  });

  it("only links to real, known dashboard routes", () => {
    const knownHrefs = [
      "/dashboard",
      "/dashboard/all-tasks",
      "/dashboard/projects",
      "/dashboard/teams",
      "/dashboard/analytics",
      "/dashboard/settings",
    ];
    for (const item of navigationItems) {
      expect(knownHrefs).toContain(item.href);
    }
  });
});
