import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { RBACAuthContext, useOptionalRBACAuth } from "../context";
import type { RBACAuthContextType } from "../context";
import type { UserRole } from "../types";

const mockContext = {
  user: null,
  setUser: () => {},
  assignRole: async () => {},
  removeRole: async () => {},
  switchContext: () => {},
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

describe("useOptionalRBACAuth", () => {
  it("returns null when used outside RBACAuthContext.Provider", () => {
    const { result } = renderHook(() => useOptionalRBACAuth());
    expect(result.current).toBeNull();
  });

  it("returns context when inside RBACAuthContext.Provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RBACAuthContext.Provider value={mockContext}>{children}</RBACAuthContext.Provider>
    );
    const { result } = renderHook(() => useOptionalRBACAuth(), { wrapper });
    expect(result.current).toBe(mockContext);
  });
});
