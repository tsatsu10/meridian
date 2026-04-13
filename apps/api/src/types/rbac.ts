/**
 * 🛡️ RBAC Types for API
 * 
 * Shared types for role-based access control
 */

export type UserRole = 
  | "guest"
  | "stakeholder" 
  | "contractor"
  | "client"
  | "member"
  | "team-lead"
  | "project-viewer"
  | "project-manager"
  | "workspace-viewer"
  | "department-head"
  | "workspace-manager";

export type PermissionAction = string;

export type PermissionKey = string;

export interface RoleAssignment {
  id: string;
  userId: string;
  role: UserRole;
  context?: string;
  contextType?: "workspace" | "project" | "department";
  isActive: boolean;
  expiresAt?: Date;
  assignedBy?: string;
  assignedAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  reason?: string;
}

export interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  roles: RoleAssignment[];
  effectiveRole: UserRole;
}

export interface Permission {
  key: string;
  name: string;
  description: string;
  category: string;
  requiresContext?: boolean;
}

export interface CustomPermission {
  id: string;
  userId: string;
  permission: string;
  granted: boolean;
  context?: string;
  contextType?: "workspace" | "project" | "department";
  expiresAt?: Date;
  createdAt: Date;
  createdBy: string;
} 
