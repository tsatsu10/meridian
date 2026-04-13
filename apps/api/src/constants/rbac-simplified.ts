/**
 * 🛡️ Simplified RBAC System with Permission Groups
 * 
 * Replaces complex 177-permission system with grouped permissions
 * for better maintainability and audit clarity
 */

import type { UserRole } from "../types/rbac";

// Permission Groups for easier management
export const PERMISSION_GROUPS = {
  // Core system access
  SYSTEM: [
    'canAccessSystem',
    'canViewDashboard',
    'canAccessPublicContent'
  ],
  
  // Project-level permissions
  PROJECT: [
    'canViewProjects',
    'canCreateProjects', 
    'canEditProjects',
    'canDeleteProjects',
    'canManageProjectSettings',
    'canArchiveProjects'
  ],
  
  // Task management
  TASKS: [
    'canViewTasks',
    'canCreateTasks',
    'canEditTasks',
    'canDeleteTasks',
    'canAssignTasks',
    'canManageTaskLabels'
  ],
  
  // Team and user management
  TEAM: [
    'canViewTeam',
    'canInviteMembers',
    'canRemoveMembers',
    'canManageRoles',
    'canViewProfiles'
  ],
  
  // Communication features
  COMMUNICATION: [
    'canAccessChat',
    'canCreateChannels',
    'canManageChannels',
    'canSendMessages',
    'canAccessFiles'
  ],
  
  // Reporting and analytics
  ANALYTICS: [
    'canViewReports',
    'canCreateReports',
    'canExportData',
    'canAccessAnalytics'
  ],
  
  // Administrative functions
  ADMIN: [
    'canManageWorkspace',
    'canAccessAuditLogs',
    'canManageIntegrations',
    'canManageSystemSettings',
    'canManageBilling'
  ],
  
  // Time tracking
  TIME: [
    'canTrackTime',
    'canViewTimeEntries',
    'canApproveTimeEntries',
    'canManageTimeTracking'
  ]
} as const;

// Simplified role hierarchy (fewer levels, clearer progression)
export const SIMPLIFIED_ROLE_HIERARCHY: Record<UserRole, number> = {
  "guest": 0,           // External viewers
  "member": 1,          // Basic team members
  "team-lead": 2,       // Team leadership
  "project-manager": 3, // Project oversight
  "department-head": 4, // Department leadership  
  "workspace-manager": 5, // Full workspace control
  
  // Specialized roles (same level as member but specific access)
  "stakeholder": 1,     // External stakeholders
  "contractor": 1,      // External contractors
  "client": 1,          // Client access
  "project-viewer": 1,  // Read-only project access
  "workspace-viewer": 1 // Read-only workspace access
};

// Role-based permission group assignments
export const ROLE_PERMISSION_GROUPS: Record<UserRole, (keyof typeof PERMISSION_GROUPS)[]> = {
  "guest": ["SYSTEM"],
  
  "member": ["SYSTEM", "PROJECT", "TASKS", "TEAM", "COMMUNICATION", "TIME"],
  
  "stakeholder": ["SYSTEM", "PROJECT", "ANALYTICS"],
  
  "contractor": ["SYSTEM", "PROJECT", "TASKS", "COMMUNICATION", "TIME"],
  
  "client": ["SYSTEM", "PROJECT", "ANALYTICS", "COMMUNICATION"],
  
  "project-viewer": ["SYSTEM", "PROJECT", "ANALYTICS"],
  
  "workspace-viewer": ["SYSTEM", "PROJECT", "TEAM", "ANALYTICS"],
  
  "team-lead": ["SYSTEM", "PROJECT", "TASKS", "TEAM", "COMMUNICATION", "ANALYTICS", "TIME"],
  
  "project-manager": ["SYSTEM", "PROJECT", "TASKS", "TEAM", "COMMUNICATION", "ANALYTICS", "TIME"],
  
  "department-head": ["SYSTEM", "PROJECT", "TASKS", "TEAM", "COMMUNICATION", "ANALYTICS", "TIME", "ADMIN"],
  
  "workspace-manager": ["SYSTEM", "PROJECT", "TASKS", "TEAM", "COMMUNICATION", "ANALYTICS", "TIME", "ADMIN"]
};

// Specific permission overrides for fine-grained control
export const ROLE_PERMISSION_OVERRIDES: Record<UserRole, Record<string, boolean>> = {
  "guest": {
    canAccessPublicContent: true,
    canViewPublicProjects: true
  },
  
  "member": {
    canDeleteProjects: false,
    canManageRoles: false,
    canAccessAuditLogs: false,
    canManageBilling: false
  },
  
  "stakeholder": {
    canEditProjects: false,
    canCreateTasks: false,
    canAssignTasks: false
  },
  
  "contractor": {
    canDeleteProjects: false,
    canManageRoles: false,
    canAccessAuditLogs: false,
    canInviteMembers: false
  },
  
  "client": {
    canEditProjects: false,
    canCreateTasks: false,
    canManageChannels: false
  },
  
  "project-viewer": {
    canEditProjects: false,
    canCreateTasks: false,
    canDeleteTasks: false,
    canAssignTasks: false
  },
  
  "workspace-viewer": {
    canEditProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canManageRoles: false
  },
  
  "team-lead": {
    canDeleteProjects: false,
    canManageWorkspace: false,
    canManageBilling: false
  },
  
  "project-manager": {
    canDeleteProjects: false,
    canManageWorkspace: false,
    canManageBilling: false,
    canAccessAuditLogs: false
  },
  
  "department-head": {
    canManageBilling: false // Only workspace managers can manage billing
  },
  
  "workspace-manager": {
    // Full permissions - no overrides needed
  }
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  // Get permission groups for the role
  const permissionGroups = ROLE_PERMISSION_GROUPS[role] || [];
  
  // Check if permission exists in any assigned group
  const hasGroupPermission = permissionGroups.some(groupName => {
    const group = PERMISSION_GROUPS[groupName];
    return group.includes(permission as any);
  });
  
  // Check for specific overrides
  const overrides = ROLE_PERMISSION_OVERRIDES[role] || {};
  const hasOverride = permission in overrides;
  
  if (hasOverride) {
    return overrides[permission];
  }
  
  return hasGroupPermission;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): string[] {
  const permissionGroups = ROLE_PERMISSION_GROUPS[role] || [];
  const overrides = ROLE_PERMISSION_OVERRIDES[role] || {};
  
  // Collect all permissions from groups
  const groupPermissions = permissionGroups.flatMap(groupName => 
    PERMISSION_GROUPS[groupName]
  );
  
  // Apply overrides
  const allPermissions = [...new Set(groupPermissions)];
  const finalPermissions = allPermissions.filter(permission => {
    if (permission in overrides) {
      return overrides[permission];
    }
    return true;
  });
  
  // Add permissions that are only in overrides
  Object.entries(overrides).forEach(([permission, allowed]) => {
    if (allowed && !finalPermissions.includes(permission)) {
      finalPermissions.push(permission);
    }
  });
  
  return finalPermissions.sort();
}

/**
 * Check if role A can perform actions that role B can perform
 */
export function roleInheritsFrom(roleA: UserRole, roleB: UserRole): boolean {
  return SIMPLIFIED_ROLE_HIERARCHY[roleA] >= SIMPLIFIED_ROLE_HIERARCHY[roleB];
}

/**
 * Get permission statistics for audit purposes
 */
export function getPermissionStats() {
  const stats = {
    totalPermissionGroups: Object.keys(PERMISSION_GROUPS).length,
    totalUniquePermissions: Object.values(PERMISSION_GROUPS).flat().length,
    roleCount: Object.keys(SIMPLIFIED_ROLE_HIERARCHY).length,
    complexityReduction: "177 permissions reduced to 8 permission groups"
  };
  
  return stats;
}

export default {
  PERMISSION_GROUPS,
  SIMPLIFIED_ROLE_HIERARCHY,
  ROLE_PERMISSION_GROUPS,
  ROLE_PERMISSION_OVERRIDES,
  hasPermission,
  getRolePermissions,
  roleInheritsFrom,
  getPermissionStats
};

