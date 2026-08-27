import type React from "react";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { RBACAuthContext } from "../context";
import type { RBACAuthContextType } from "../context";
import type { UserRole } from "../types";
import { useProjectPermissions } from "../hooks";

const mockContext = {
  user: null,
  setUser: () => {},
  assignRole: async () => {},
  removeRole: async () => {},
  switchContext: () => {},
  // Even if the matrix would allow everything, missing project context must fail closed.
  hasPermission: () => true,
  checkPermission: () => ({ allowed: true, role: "member" as UserRole }),
  canAccessResource: () => true,
  hasAnyPermission: () => true,
  hasAllPermissions: () => true,
  getAllowedActions: () => [],
  canActAs: () => false,
  isMinimumRole: () => true,
  getRoleDisplayName: () => "Member",
  getRoleLevel: () => 1,
  currentWorkspace: undefined,
  currentProject: undefined,
  currentDepartment: undefined,
  setCurrentWorkspace: () => {},
  setCurrentProject: () => {},
  setCurrentDepartment: () => {},
  isLoading: false,
  isRoleLoading: false,
  error: null,
} as RBACAuthContextType;

describe("useProjectPermissions honesty", () => {
  it("fails closed on every can* flag when no project id is in context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RBACAuthContext.Provider value={mockContext}>
        {children}
      </RBACAuthContext.Provider>
    );
    const { result } = renderHook(() => useProjectPermissions(), { wrapper });

    expect(result.current.projectId).toBeNull();
    expect(result.current.canView).toBe(false);
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canManage).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canArchive).toBe(false);
    expect(result.current.canClone).toBe(false);
    expect(result.current.canManageTeam).toBe(false);
    expect(result.current.canManageBudget).toBe(false);
    expect(result.current.canViewAnalytics).toBe(false);
    expect(result.current.canCreateTasks).toBe(false);
    expect(result.current.canAssignTasks).toBe(false);
    expect(result.current.canInviteMembers).toBe(false);
    expect(result.current.canRemoveMembers).toBe(false);
  });
});
