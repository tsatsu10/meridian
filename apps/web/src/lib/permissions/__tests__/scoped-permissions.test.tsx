/**
 * useWorkspacePermissions/useProjectPermissions accept a target
 * workspaceId/projectId to check permissions for, but ignored it when
 * calling hasPermission() — hasPermission defaults its context to the
 * caller's *currently active* workspace/project (see provider.tsx) when
 * no context is passed. So a UI asking "can I manage workspace B" while
 * the user's active workspace is A actually got the answer for A,
 * mislabeled as B's. checkContextualPermissions really does scope
 * project-manager/project-viewer roles to their assigned projectIds and
 * department-heads to their assigned departmentIds, so this wasn't a
 * cosmetic gap — a project-manager assigned only to project A could see
 * "can manage" controls enabled for project B's row in a list, as long as
 * A happened to be their active project.
 *
 * This proves both hooks now pass the target id as context, so the
 * permission check is actually scoped to the workspace/project being
 * asked about, not the ambient active one.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWorkspacePermissions, useProjectPermissions } from "../hooks";
import { useRBACAuth } from "../context";

vi.mock("../context", () => ({
  useRBACAuth: vi.fn(),
}));

describe("useWorkspacePermissions scopes checks to the target workspace", () => {
  it("passes the target workspaceId as context, not the ambient current one", () => {
    const hasPermission = vi.fn().mockReturnValue(true);
    vi.mocked(useRBACAuth).mockReturnValue({
      hasPermission,
      currentWorkspace: "workspace-A",
    } as unknown as ReturnType<typeof useRBACAuth>);

    renderHook(() => useWorkspacePermissions("workspace-B"));

    expect(hasPermission).toHaveBeenCalledWith(
      "canViewWorkspace",
      expect.objectContaining({ workspaceId: "workspace-B" }),
    );
  });
});

describe("useProjectPermissions scopes checks to the target project", () => {
  it("passes the target projectId as context, not the ambient current one", () => {
    const hasPermission = vi.fn().mockReturnValue(true);
    vi.mocked(useRBACAuth).mockReturnValue({
      hasPermission,
      currentProject: "project-A",
    } as unknown as ReturnType<typeof useRBACAuth>);

    renderHook(() => useProjectPermissions("project-B"));

    expect(hasPermission).toHaveBeenCalledWith(
      "canEditProjects",
      expect.objectContaining({ projectId: "project-B" }),
    );
  });
});
