/**
 * project.icon stores a Lucide icon NAME (e.g. "Settings", set for
 * "Start from Scratch" projects in create-project-modal.tsx:222, or a
 * template's own icon name) — not an emoji or renderable character. The card
 * rendered `project.icon` directly as text with no name→component lookup, so
 * every project created via "Start from Scratch" showed the literal word
 * "Settings" overlapping its icon box instead of the gear icon.
 *
 * apps/web/src/routes/dashboard/workspace/$workspaceId/project/$projectId/_layout.tsx
 * already does this correctly via the shared `@/constants/project-icons` map
 * — this proves the grid card now does the same lookup instead of printing
 * the raw name.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnhancedProjectGridCard } from "../enhanced-project-grid-card";
import type { ProjectDashboardRow } from "@/types/project";

function makeProject(
  overrides: Partial<ProjectDashboardRow>,
): ProjectDashboardRow {
  return {
    id: "project-1",
    name: "Test Project",
    description: "",
    status: "planning",
    priority: "medium",
    tasks: [],
    members: [],
    dueDate: null,
    isArchived: false,
    ...overrides,
  } as unknown as ProjectDashboardRow;
}

describe("EnhancedProjectGridCard icon resolution", () => {
  it("does not render the raw icon-name string as text", () => {
    render(
      <EnhancedProjectGridCard
        project={makeProject({ icon: "Settings" })}
        index={0}
        isPinned={false}
        onProjectClick={() => {}}
      />,
    );

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("falls back to the default folder icon for an unknown icon name", () => {
    const { container } = render(
      <EnhancedProjectGridCard
        project={makeProject({ icon: "NotARealIconName" })}
        index={0}
        isPinned={false}
        onProjectClick={() => {}}
      />,
    );

    expect(screen.queryByText("NotARealIconName")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a real icon svg for a known icon name", () => {
    const { container } = render(
      <EnhancedProjectGridCard
        project={makeProject({ icon: "Settings" })}
        index={0}
        isPinned={false}
        onProjectClick={() => {}}
      />,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
